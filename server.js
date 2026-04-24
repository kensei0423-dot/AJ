const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const session = require('express-session');


const app = express();
app.use(express.json());

// Session middleware
app.use(session({
    secret: 'ajcloud-demo-secret-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
}));

app.use(express.static(path.join(__dirname)));

// PayPal Configuration
const PAYPAL_CLIENT_ID = 'AVkXtxVTYa-8-B3rc3R-V1oDdkKLczfkjQhysVVxdG4aj--k1WOvpfFN5hyP87KE1ve_Tt3tgV7ZgD0y';
const PAYPAL_SECRET = 'EKH_rpKcyiuaoki9p9EDkmqCWtNylpy2B8toZgN-RH3sVULZhaRRA8llOXvJN-bFtVmwsZlQx26y4RDj';
const PAYPAL_MODE = 'sandbox';
const PAYPAL_BASE = `https://api-m.${PAYPAL_MODE}.paypal.com`;

// Product catalog
const PRODUCTS = {
    // Cloud storage subscriptions
    monthly_basic:    { name: 'Basic Monthly',    price: '4.99',   description: 'Basic Cloud Storage - 7 Days Rolling', type: 'subscription', duration: 30, devices: 1 },
    monthly_standard: { name: 'Standard Monthly', price: '9.99',   description: 'Standard Cloud Storage - 30 Days Rolling', type: 'subscription', duration: 30, devices: 3 },
    yearly_premium:   { name: 'Premium Yearly',   price: '79.99',  description: 'Premium Cloud Storage - 365 Days Rolling', type: 'subscription', duration: 365, devices: 5 },
    yearly_business:  { name: 'Business Yearly',  price: '199.99', description: 'Business Cloud Storage - Unlimited', type: 'subscription', duration: 365, devices: 10 },
    // Data traffic packages
    data_5gb:   { name: '5GB Traffic',   price: '1.99',  description: '5GB Cloud Traffic',   type: 'traffic', dataGB: 5 },
    data_20gb:  { name: '20GB Traffic',  price: '4.99',  description: '20GB Cloud Traffic',  type: 'traffic', dataGB: 20 },
    data_50gb:  { name: '50GB Traffic',  price: '9.99',  description: '50GB Cloud Traffic',  type: 'traffic', dataGB: 50 },
    data_100gb: { name: '100GB Traffic', price: '14.99', description: '100GB Cloud Traffic', type: 'traffic', dataGB: 100 },
    data_500gb: { name: '500GB Traffic', price: '49.99', description: '500GB Cloud Traffic', type: 'traffic', dataGB: 500 },
    data_1tb:   { name: '1TB Traffic',   price: '79.99', description: '1TB Cloud Traffic',   type: 'traffic', dataGB: 1000 },
};

// In-memory user store (persisted to users.json)
const USERS_FILE = path.join(__dirname, 'users.json');
let users = {};

// Load users from file
function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
            console.log('Loaded users from users.json:', Object.keys(users).join(', '));
        }
    } catch (e) {
        console.error('Failed to load users.json:', e.message);
    }
}

// Save users to file
function saveUsers() {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (e) {
        console.error('Failed to save users.json:', e.message);
    }
}

// Seed test accounts (only if not already present)
function seedTestUsers() {
    const pw = hashPassword('abc123');
    const now = new Date().toISOString();
    let seeded = false;
    if (!users.test1) {
        users.test1 = { username: 'test1', passwordHash: pw, coins: 0, bonus: 0, vipStatus: null, orders: [], savedPaymentMethods: [], createdAt: now };
        seeded = true;
    }
    if (!users.test2) {
        users.test2 = { username: 'test2', passwordHash: pw, coins: 0, bonus: 0, vipStatus: null, orders: [], savedPaymentMethods: [], createdAt: now };
        seeded = true;
    }
    if (seeded) {
        saveUsers();
        console.log('Seeded missing test accounts (password: abc123)');
    }
}
loadUsers();
seedTestUsers();

// Helper: hash password
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Helper: get user summary (safe to return to client)
function getUserSummary(user) {
    return {
        username: user.username,
        coins: user.coins,
        bonus: user.bonus,
        vipStatus: user.vipStatus,
        savedPaymentMethods: user.savedPaymentMethods || [],
        createdAt: user.createdAt,
    };
}

// Auth middleware
function requireAuth(req, res, next) {
    if (!req.session.username) {
        if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        return res.redirect('/login');
    }
    next();
}

// ─── Order Stats Tracking (persisted to file) ────────────────
const ORDER_STATS_FILE = path.join(__dirname, 'order-stats.json');
let orderStats = { initiated: 0, success: 0, failed: 0 };
try {
    if (fs.existsSync(ORDER_STATS_FILE)) {
        orderStats = JSON.parse(fs.readFileSync(ORDER_STATS_FILE, 'utf8'));
        console.log('Loaded order stats:', orderStats);
    }
} catch (e) { console.error('Failed to load order stats:', e.message); }

function saveOrderStats() {
    try { fs.writeFileSync(ORDER_STATS_FILE, JSON.stringify(orderStats)); } catch (e) {}
}

const pendingOrders = new Map(); // orderId → { username, productId, savePaymentMethod, appScheme, approveUrl, createdAt }

const seenRequestIds = new Map(); // requestId → timestamp

// Generate deterministic request ID (same ID within 30-minute window)
function generateRequestId(username, productId, action) {
    const unique = crypto.randomBytes(4).toString('hex');
    return `${action}-${username}-${productId}-${Date.now()}-${unique}`;
}

// Track initiated orders, dedup by request ID (30-min TTL)
function trackInitiated(requestId) {
    const now = Date.now();
    for (const [id, ts] of seenRequestIds) {
        if (now - ts > 30 * 60 * 1000) seenRequestIds.delete(id);
    }
    if (seenRequestIds.has(requestId)) {
        console.log('  [dedup] skipped initiated++ for:', requestId);
        return false;
    }
    seenRequestIds.set(requestId, now);
    orderStats.initiated++; saveOrderStats();
    console.log('  [dedup] initiated++ for new requestId:', requestId);
    return true;
}

// Get PayPal access token
async function getAccessToken() {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
    const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });
    const data = await response.json();
    return data.access_token;
}

// ─── Auth Endpoints ───────────────────────────────────────────

// Register
app.post('/auth/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, underscore)' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (users[username]) {
        return res.status(409).json({ error: 'Username already taken' });
    }

    users[username] = {
        username,
        passwordHash: hashPassword(password),
        coins: 0,
        bonus: 0,
        vipStatus: null,
        orders: [],
        savedPaymentMethods: [],
        createdAt: new Date().toISOString(),
    };

    req.session.username = username;
    saveUsers();
    console.log('User registered:', username);
    res.json({ success: true, user: getUserSummary(users[username]) });
});

// Login
app.post('/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const user = users[username];
    if (!user || user.passwordHash !== hashPassword(password)) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.username = username;
    console.log('User logged in:', username);
    res.json({ success: true, user: getUserSummary(user) });
});

// Logout
app.post('/auth/logout', (req, res) => {
    const username = req.session.username;
    req.session.destroy(() => {
        console.log('User logged out:', username);
        res.json({ success: true });
    });
});

// Get current user
app.get('/auth/me', (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = users[req.session.username];
    if (!user) {
        return res.status(401).json({ error: 'User not found' });
    }
    res.json(getUserSummary(user));
});

// ─── Page Routes ──────────────────────────────────────────────

// Serve login page
app.get('/login', (req, res) => {
    if (req.session.username) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Serve profile page
app.get('/profile', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'profile.html'));
});

// Serve the store page (protected)
app.get('/', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── PayPal Endpoints ─────────────────────────────────────────

// Generate client token for PayPal JS SDK V6
// Uses response_type=client_token for V6 SDK initialization
app.get('/api/client-token', async (req, res) => {
    try {
        const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');

        const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials&response_type=client_token',
        });
        const data = await response.json();
        console.log('V6 client token generated, expires_in:', data.expires_in);
        res.json({ clientToken: data.access_token });
    } catch (error) {
        console.error('Client token error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create Order - PayPal Orders v2
app.post('/api/orders', requireAuth, async (req, res) => {
    try {
        const { productId, savePaymentMethod } = req.body;
        const product = PRODUCTS[productId];
        if (!product) {
            return res.status(400).json({ error: 'Invalid product' });
        }

        // Store pending product in session for capture
        req.session.pendingProductId = productId;

        // Use client-provided returnUrl for mobile app, fallback to localhost
        const baseReturnUrl = req.body.returnUrl || 'http://localhost:3666';
        const returnUrl = baseReturnUrl.replace(/\/$/, '') + '/payment/return';
        const cancelUrl = baseReturnUrl.replace(/\/$/, '');

        const accessToken = await getAccessToken();
        const requestId = generateRequestId(req.session.username, productId, 'create');

        const orderBody = {
            intent: 'CAPTURE',
            purchase_units: [{
                description: product.description,
                invoice_id: 'ajcloud-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                amount: {
                    currency_code: 'USD',
                    value: product.price,
                    breakdown: {
                        item_total: {
                            currency_code: 'USD',
                            value: product.price,
                        },
                    },
                },
                items: [{
                    name: product.name,
                    unit_amount: {
                        currency_code: 'USD',
                        value: product.price,
                    },
                    quantity: '1',
                    description: product.description,
                    sku: productId,
                    category: 'DIGITAL_GOODS',
                    url: 'https://www.example.com',
                    image_url: 'https://image.16pic.com/00/93/65/16pic_9365586_s.png',
                }],
            }],
        };

        if (req.body.v6) {
            // V6 SDK handles popup — but PayPal API still requires experience_context when payment_source is present
            if (savePaymentMethod) {
                orderBody.payment_source = {
                    paypal: {
                        experience_context: {
                            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
                            return_url: returnUrl,
                            cancel_url: cancelUrl,
                            shipping_preference: 'NO_SHIPPING',
                        },
                        attributes: {
                            vault: {
                                store_in_vault: 'ON_SUCCESS',
                                usage_type: 'MERCHANT',
                                customer_type: 'CONSUMER',
                            },
                        },
                    },
                };
                console.log('V6 order with vault-with-purchase enabled');
            } else {
                orderBody.payment_source = {
                    paypal: {
                        experience_context: {
                            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
                            return_url: returnUrl,
                            cancel_url: cancelUrl,
                            shipping_preference: 'NO_SHIPPING',
                        },
                    },
                };
            }
        } else {
            orderBody.payment_source = {
                paypal: {
                    experience_context: {
                        payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
                        return_url: 'http://localhost:3666/payment/return',
                        cancel_url: 'http://localhost:3666/payment/cancel',
                        shipping_preference: 'NO_SHIPPING',
                    },
                },
            };

            if (savePaymentMethod) {
                orderBody.payment_source.paypal.attributes = {
                    vault: {
                        store_in_vault: 'ON_SUCCESS',
                        usage_type: 'MERCHANT',
                        customer_type: 'CONSUMER',
                    },
                };
                console.log('Order with vault-with-purchase enabled');
            }
        }

        const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'PayPal-Request-Id': requestId,
            },
            body: JSON.stringify(orderBody),
        });

        const order = await response.json();
        console.log('Order created:', order.id, '-', product.name, '$' + product.price, '- User:', req.session.username, '- RequestId:', requestId);

        trackInitiated(requestId);
        if (!order.id) {
            orderStats.failed++; saveOrderStats();
        }

        const approveUrl = order.links?.find(l => l.rel === 'payer-action')?.href
                        || order.links?.find(l => l.rel === 'approve')?.href;

        // Detect app scheme from User-Agent (AJExternalPayment → ajexternal)
        const ua = req.headers['user-agent'] || '';
        const appScheme = ua.includes('AJExternalPayment') ? 'ajexternal' : null;

        // Store pending order for /payment/return (needed for SFSafariViewController which has no session)
        if (order.id) {
            pendingOrders.set(order.id, {
                username: req.session.username,
                productId,
                savePaymentMethod,
                appScheme,
                approveUrl: approveUrl || null,
                createdAt: Date.now(),
            });
        }

        res.json({ id: order.id, links: order.links, approveUrl });
    } catch (error) {
        console.error('Create order error:', error);
        const requestId = generateRequestId(req.session.username, req.body.productId, 'create');
        trackInitiated(requestId);
        orderStats.failed++; saveOrderStats();
        res.status(500).json({ error: error.message });
    }
});

// Payment return — handles redirect from PayPal (browser or SFSafariViewController)
// No requireAuth — SFSafariViewController doesn't share WKWebView session cookies
app.get('/payment/return', async (req, res) => {
    try {
        const token = req.query.token; // PayPal order ID
        if (!token) {
            return res.redirect('/');
        }

        // Look up pending order (works even without session)
        const pending = pendingOrders.get(token);
        const username = pending?.username || req.session?.username;
        const productId = pending?.productId || req.session?.pendingProductId;
        const appScheme = pending?.appScheme || null;

        console.log('Payment return - token:', token, '- pending:', !!pending, '- username:', username, '- appScheme:', appScheme);

        const accessToken = await getAccessToken();
        const requestId = generateRequestId(username || 'unknown', token, 'capture');

        const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${token}/capture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'PayPal-Request-Id': requestId,
            },
        });

        const data = await response.json();
        console.log('Payment return - Order captured:', token, '- Status:', data.status);

        if (data.status === 'COMPLETED') {
            orderStats.success++; saveOrderStats();
            const capture = data.purchase_units[0].payments.captures[0];
            const amount = capture.amount.value;
            const user = username ? users[username] : null;
            const product = PRODUCTS[productId];

            if (user && product) {
                creditUser(user, productId, token, amount);
                if (product.type === 'subscription') {
                    console.log('  Credited:', username, '+' + product.devices, 'devices');
                } else if (product.type === 'traffic') {
                    console.log('  Credited:', username, '+' + product.dataGB, 'GB storage');
                }

                // Vault: save payment method if present
                const paypalVault = data.payment_source?.paypal?.attributes?.vault;
                const cardVault = data.payment_source?.card?.attributes?.vault;
                const vaultInfo = paypalVault || cardVault;
                const vaultType = paypalVault ? 'paypal' : (cardVault ? 'card' : null);
                if (vaultInfo && vaultInfo.id) {
                    if (!user.savedPaymentMethods) user.savedPaymentMethods = [];
                    const exists = user.savedPaymentMethods.some(m => m.paymentTokenId === vaultInfo.id);
                    if (!exists) {
                        const customerId = vaultInfo.customer?.id || null;
                        const email = vaultType === 'card'
                            ? ('Card ending ' + (data.payment_source?.card?.last_digits || '****'))
                            : (data.payment_source?.paypal?.email_address || 'PayPal Account');
                        user.savedPaymentMethods.push({
                            paymentTokenId: vaultInfo.id,
                            customerId,
                            type: vaultType,
                            email,
                            brand: data.payment_source?.card?.brand || null,
                            lastDigits: data.payment_source?.card?.last_digits || null,
                            savedAt: new Date().toISOString(),
                        });
                        saveUsers();
                        console.log('  Vault saved:', vaultInfo.id, '- Type:', vaultType);
                    }
                }
            }

            // Clean up
            pendingOrders.delete(token);
            if (req.session) delete req.session.pendingProductId;

            // Redirect: app scheme or web page
            if (appScheme) {
                res.redirect(`${appScheme}://payment/success?orderId=${token}&amount=${amount}`);
            } else {
                res.redirect(`/?payment=success&orderId=${token}&amount=${amount}`);
            }
        } else {
            orderStats.failed++; saveOrderStats();
            pendingOrders.delete(token);
            if (appScheme) {
                res.redirect(`${appScheme}://payment/failed?orderId=${token}`);
            } else {
                res.redirect('/?payment=failed');
            }
        }
    } catch (error) {
        console.error('Payment return error:', error);
        const pending = pendingOrders.get(req.query.token);
        const appScheme = pending?.appScheme;
        pendingOrders.delete(req.query.token);
        if (appScheme) {
            res.redirect(`${appScheme}://payment/failed`);
        } else {
            res.redirect('/?payment=error');
        }
    }
});

// Payment cancel
app.get('/payment/cancel', (req, res) => {
    const token = req.query.token;
    const pending = pendingOrders.get(token);
    const appScheme = pending?.appScheme;
    if (token) pendingOrders.delete(token);
    if (appScheme) {
        res.redirect(`${appScheme}://payment/cancelled`);
    } else {
        res.redirect('/?payment=cancelled');
    }
});

// Get approve URL for an order (used by iOS JS bridge)
app.get('/api/orders/:orderID/approve-url', (req, res) => {
    const pending = pendingOrders.get(req.params.orderID);
    if (pending && pending.approveUrl) {
        res.json({ approveUrl: pending.approveUrl });
    } else {
        res.status(404).json({ error: 'Order not found or no approve URL' });
    }
});

// Capture Order - PayPal Orders v2
app.post('/api/orders/:orderID/capture', requireAuth, async (req, res) => {
    try {
        const { orderID } = req.params;
        const accessToken = await getAccessToken();
        const requestId = generateRequestId(req.session.username, orderID, 'capture');

        const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'PayPal-Request-Id': requestId,
            },
        });

        const data = await response.json();
        console.log('Order captured:', orderID, '- Status:', data.status);
        console.log('  payment_source:', JSON.stringify(data.payment_source, null, 2));

        if (data.status === 'COMPLETED') {
            orderStats.success++; saveOrderStats();
            const capture = data.purchase_units[0].payments.captures[0];
            console.log('  Amount:', capture.amount.currency_code, capture.amount.value);

            // Credit user account
            const user = users[req.session.username];
            const productId = req.session.pendingProductId;
            const product = PRODUCTS[productId];

            if (user && product) {
                creditUser(user, productId, orderID, capture.amount.value);
                if (product.type === 'subscription') {
                    console.log('  Credited:', req.session.username, '+' + product.devices, 'devices, subscription until', user.vipStatus.expiresAt);
                } else if (product.type === 'traffic') {
                    console.log('  Credited:', req.session.username, '+' + product.dataGB, 'GB storage');
                }
                delete req.session.pendingProductId;

                // Vault with purchase: extract saved payment method from capture response
                const paypalVault = data.payment_source?.paypal?.attributes?.vault;
                const cardVault = data.payment_source?.card?.attributes?.vault;
                const vaultInfo = paypalVault || cardVault;
                const vaultType = paypalVault ? 'paypal' : (cardVault ? 'card' : null);
                console.log('  Vault check - paypalVault:', JSON.stringify(paypalVault), 'cardVault:', JSON.stringify(cardVault));
                if (vaultInfo && vaultInfo.id) {
                    if (!user.savedPaymentMethods) user.savedPaymentMethods = [];
                    const exists = user.savedPaymentMethods.some(m => m.paymentTokenId === vaultInfo.id);
                    if (!exists) {
                        const customerId = vaultInfo.customer?.id || null;
                        const email = vaultType === 'card'
                            ? ('Card ending ' + (data.payment_source?.card?.last_digits || '****'))
                            : (data.payment_source?.paypal?.email_address || 'PayPal Account');
                        const brand = data.payment_source?.card?.brand || null;
                        const lastDigits = data.payment_source?.card?.last_digits || null;
                        user.savedPaymentMethods.push({
                            paymentTokenId: vaultInfo.id,
                            customerId,
                            type: vaultType,
                            email,
                            brand,
                            lastDigits,
                            savedAt: new Date().toISOString(),
                        });
                        saveUsers();
                        console.log('  Vault saved:', req.session.username, ':', email, '- Token:', vaultInfo.id, '- Status:', vaultInfo.status, '- Customer:', customerId);
                    }
                } else {
                    console.log('  Vault: no vault info found in capture response');
                }
            }
        } else {
            orderStats.failed++; saveOrderStats();
        }

        res.json(data);
    } catch (error) {
        console.error('Capture order error:', error);
        orderStats.failed++; saveOrderStats();
        res.status(500).json({ error: error.message });
    }
});

// ─── 3DS Failed ──────────────────────────────────────────────

app.post('/api/orders/3ds-failed', requireAuth, (req, res) => {
    const { orderId, liabilityShift } = req.body;
    console.log('3DS failed - Order:', orderId, '- liabilityShift:', liabilityShift, '- User:', req.session.username);
    orderStats.failed++; saveOrderStats();
    res.json({ ok: true });
});

// ─── ACDC (Advanced Credit and Debit Card) ───────────────────

app.post('/api/orders/card', requireAuth, async (req, res) => {
    try {
        const { productId, savePaymentMethod } = req.body;
        const product = PRODUCTS[productId];
        if (!product) {
            return res.status(400).json({ error: 'Invalid product' });
        }

        req.session.pendingProductId = productId;

        const accessToken = await getAccessToken();
        const requestId = `card-${req.session.username}-${productId}-${Date.now()}`;

        const orderBody = {
            intent: 'CAPTURE',
            purchase_units: [{
                description: product.description,
                invoice_id: 'ajcloud-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                amount: {
                    currency_code: 'USD',
                    value: product.price,
                    breakdown: {
                        item_total: {
                            currency_code: 'USD',
                            value: product.price,
                        },
                    },
                },
                items: [{
                    name: product.name,
                    unit_amount: {
                        currency_code: 'USD',
                        value: product.price,
                    },
                    quantity: '1',
                    description: product.description,
                    sku: productId,
                    category: 'DIGITAL_GOODS',
                    url: 'https://www.example.com',
                    image_url: 'https://image.16pic.com/00/93/65/16pic_9365586_s.png',
                }],
            }],
            application_context: {
                shipping_preference: 'NO_SHIPPING',
            },
        };

        // Always enable 3DS verification
        orderBody.payment_source = {
            card: {
                attributes: {
                    verification: {
                        method: 'SCA_ALWAYS',
                    },
                },
            },
        };

        if (savePaymentMethod) {
            const user = users[req.session.username];
            const existingCustomerId = user?.savedPaymentMethods?.find(m => m.customerId)?.customerId;
            orderBody.payment_source.card.attributes.vault = {
                store_in_vault: 'ON_SUCCESS',
            };
            if (existingCustomerId) {
                orderBody.payment_source.card.attributes.customer = { id: existingCustomerId };
            }
            console.log('Card order with vault-with-purchase enabled, customer:', existingCustomerId || '(new)');
        }

        console.log('Card order request body:', JSON.stringify(orderBody, null, 2));

        const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'PayPal-Request-Id': requestId,
            },
            body: JSON.stringify(orderBody),
        });

        const order = await response.json();
        console.log('Card order response:', JSON.stringify(order, null, 2));
        if (!order.id) console.log('  Card order error: no order ID returned');

        trackInitiated(requestId);
        if (!order.id) {
            orderStats.failed++; saveOrderStats();
        }

        res.json({ id: order.id });
    } catch (error) {
        console.error('Card create order error:', error);
        const requestId = `card-${req.session.username}-${req.body.productId}-${Date.now()}`;
        trackInitiated(requestId);
        orderStats.failed++; saveOrderStats();
        res.status(500).json({ error: error.message });
    }
});

// ─── Vault Endpoints (Save Payment Method) ───────────────────

// Helper: credit user account after payment
function creditUser(user, productId, orderId, amount) {
    const product = PRODUCTS[productId];
    if (!product) return null;

    const orderRecord = {
        id: orderId,
        productId,
        productName: product.name,
        amount,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        devicesAdded: 0,
        storageAdded: 0,
    };

    if (product.type === 'subscription') {
        user.coins += product.devices;
        orderRecord.devicesAdded = product.devices;
        const now = new Date();
        user.vipStatus = {
            plan: productId,
            expiresAt: new Date(now.getTime() + product.duration * 24 * 60 * 60 * 1000).toISOString(),
        };
    } else if (product.type === 'traffic') {
        user.bonus += product.dataGB;
        orderRecord.storageAdded = product.dataGB;
    }

    user.orders.unshift(orderRecord);
    saveUsers();
    return orderRecord;
}

// Create vault setup token
app.post('/api/vault/setup-token', requireAuth, async (req, res) => {
    try {
        const accessToken = await getAccessToken();

        const response = await fetch(`${PAYPAL_BASE}/v3/vault/setup-tokens`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                payment_source: {
                    paypal: {
                        usage_type: 'MERCHANT',
                        customer_type: 'CONSUMER',
                        experience_context: {
                            return_url: returnUrl,
                            cancel_url: cancelUrl,
                            shipping_preference: 'NO_SHIPPING',
                        },
                    },
                },
            }),
        });

        const data = await response.json();
        console.log('Vault setup token created:', data.id, '- User:', req.session.username);
        res.json(data);
    } catch (error) {
        console.error('Setup token error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create payment token from approved setup token
app.post('/api/vault/payment-token', requireAuth, async (req, res) => {
    try {
        const { setupTokenId } = req.body;
        if (!setupTokenId) {
            return res.status(400).json({ error: 'setupTokenId required' });
        }

        const accessToken = await getAccessToken();

        const response = await fetch(`${PAYPAL_BASE}/v3/vault/payment-tokens`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                payment_source: {
                    token: {
                        id: setupTokenId,
                        type: 'SETUP_TOKEN',
                    },
                },
            }),
        });

        const data = await response.json();
        console.log('Payment token created:', data.id, '- User:', req.session.username);

        // Store in user's saved methods
        const user = users[req.session.username];
        if (user && data.id) {
            if (!user.savedPaymentMethods) user.savedPaymentMethods = [];

            // Avoid duplicates
            const exists = user.savedPaymentMethods.some(m => m.paymentTokenId === data.id);
            if (!exists) {
                user.savedPaymentMethods.push({
                    paymentTokenId: data.id,
                    email: data.payment_source?.paypal?.email_address || 'PayPal Account',
                    savedAt: new Date().toISOString(),
                });
                saveUsers();
                console.log('  Saved payment method for', req.session.username, ':', data.payment_source?.paypal?.email_address);
            }
        }

        res.json(data);
    } catch (error) {
        console.error('Payment token error:', error);
        res.status(500).json({ error: error.message });
    }
});

// List saved payment methods
app.get('/api/vault/payment-methods', requireAuth, (req, res) => {
    const user = users[req.session.username];
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.savedPaymentMethods || []);
});

// Delete saved payment method
app.delete('/api/vault/payment-methods/:tokenId', requireAuth, async (req, res) => {
    try {
        const { tokenId } = req.params;
        const user = users[req.session.username];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Remove from PayPal vault
        const accessToken = await getAccessToken();
        await fetch(`${PAYPAL_BASE}/v3/vault/payment-tokens/${tokenId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        // Remove from user's saved methods
        if (!user.savedPaymentMethods) user.savedPaymentMethods = [];
        user.savedPaymentMethods = user.savedPaymentMethods.filter(m => m.paymentTokenId !== tokenId);
        saveUsers();

        console.log('Deleted payment method:', tokenId, '- User:', req.session.username);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete payment method error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Pay with saved payment method (no popup)
app.post('/api/orders/saved', requireAuth, async (req, res) => {
    try {
        const { productId, paymentTokenId } = req.body;
        const product = PRODUCTS[productId];
        if (!product) {
            return res.status(400).json({ error: 'Invalid product' });
        }

        // Verify the token belongs to the user
        const user = users[req.session.username];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!user.savedPaymentMethods) user.savedPaymentMethods = [];
        const savedMethod = user.savedPaymentMethods.find(m => m.paymentTokenId === paymentTokenId);
        if (!savedMethod) {
            return res.status(400).json({ error: 'Payment method not found' });
        }

        const accessToken = await getAccessToken();

        // Create order with vault_id — auto-approved and captured
        const requestId = generateRequestId(req.session.username, productId, 'saved');
        const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'PayPal-Request-Id': requestId,
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    description: product.description,
                    invoice_id: 'ajcloud-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                    amount: {
                        currency_code: 'USD',
                        value: product.price,
                        breakdown: {
                            item_total: {
                                currency_code: 'USD',
                                value: product.price,
                            },
                        },
                    },
                    items: [{
                        name: product.name,
                        unit_amount: {
                            currency_code: 'USD',
                            value: product.price,
                        },
                        quantity: '1',
                        description: product.description,
                        sku: productId,
                        category: 'DIGITAL_GOODS',
                        url: 'https://www.example.com',
                        image_url: 'https://image.16pic.com/00/93/65/16pic_9365586_s.png',
                    }],
                }],
                application_context: {
                    shipping_preference: 'NO_SHIPPING',
                },
                payment_source: savedMethod.type === 'card'
                    ? { card: { vault_id: paymentTokenId } }
                    : { paypal: { vault_id: paymentTokenId } },
            }),
        });

        const data = await response.json();
        console.log('Saved payment order:', data.id, '- Status:', data.status, '- User:', req.session.username, '- RequestId:', requestId);
        trackInitiated(requestId);

        if (data.status === 'COMPLETED') {
            orderStats.success++; saveOrderStats();
            const capture = data.purchase_units[0].payments.captures[0];
            console.log('  Amount:', capture.amount.currency_code, capture.amount.value);

            const orderRecord = creditUser(user, productId, data.id, capture.amount.value);
            if (orderRecord) {
                if (product.type === 'subscription') {
                    console.log('  Credited:', req.session.username, '+' + product.devices, 'devices, subscription until', user.vipStatus.expiresAt);
                } else if (product.type === 'traffic') {
                    console.log('  Credited:', req.session.username, '+' + product.dataGB, 'GB storage');
                }
            }
        } else {
            orderStats.failed++; saveOrderStats();
        }

        res.json(data);
    } catch (error) {
        console.error('Saved payment error:', error);
        const requestId = generateRequestId(req.session.username, req.body.productId, 'saved');
        trackInitiated(requestId);
        orderStats.failed++; saveOrderStats();
        res.status(500).json({ error: error.message });
    }
});

// ─── Subscription Endpoints ──────────────────────────────────

// Change subscription plan (switch between weekly and yearly)
app.post('/api/subscription/change', requireAuth, (req, res) => {
    const { newPlan } = req.body;
    const validPlans = ['monthly_basic', 'monthly_standard', 'yearly_premium', 'yearly_business'];
    if (!newPlan || !validPlans.includes(newPlan)) {
        return res.status(400).json({ error: 'Invalid plan' });
    }

    const user = users[req.session.username];
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    if (!user.vipStatus) {
        return res.status(400).json({ error: 'No active subscription' });
    }
    if (user.vipStatus.plan === newPlan) {
        return res.status(400).json({ error: 'Already on this plan' });
    }

    const product = PRODUCTS[newPlan];
    const now = new Date();
    user.vipStatus = {
        plan: newPlan,
        expiresAt: new Date(now.getTime() + product.duration * 24 * 60 * 60 * 1000).toISOString(),
    };
    saveUsers();

    console.log('Subscription changed:', req.session.username, '->', product.name, 'until', user.vipStatus.expiresAt);
    res.json({ success: true, vipStatus: user.vipStatus });
});

// Renew subscription with discount (2% retention or 5% weekly renewal)
app.post('/api/subscription/renew-discount', requireAuth, (req, res) => {
    const { plan, discountRate } = req.body;
    const validPlans = ['monthly_basic', 'monthly_standard', 'yearly_premium', 'yearly_business'];
    if (!plan || !validPlans.includes(plan)) {
        return res.status(400).json({ error: 'Invalid plan' });
    }

    const allowedRates = [0.02, 0.05];
    const rate = allowedRates.includes(discountRate) ? discountRate : 0.02;

    const user = users[req.session.username];
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    if (!user.vipStatus) {
        return res.status(400).json({ error: 'No active subscription' });
    }

    const product = PRODUCTS[plan];
    const now = new Date();
    user.vipStatus = {
        plan,
        expiresAt: new Date(now.getTime() + product.duration * 24 * 60 * 60 * 1000).toISOString(),
        discount: rate,
    };
    saveUsers();

    const discountPrice = (parseFloat(product.price) * (1 - rate)).toFixed(2);
    console.log(`Subscription renewed with ${rate * 100}% discount:`, req.session.username, '-', product.name, '$' + discountPrice, 'until', user.vipStatus.expiresAt);
    res.json({ success: true, vipStatus: user.vipStatus });
});

// Cancel subscription
app.post('/api/subscription/cancel', requireAuth, (req, res) => {
    const user = users[req.session.username];
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    if (!user.vipStatus) {
        return res.status(400).json({ error: 'No active subscription' });
    }

    console.log('Subscription cancelled:', req.session.username, '-', user.vipStatus.plan);
    user.vipStatus = null;
    saveUsers();

    res.json({ success: true });
});

// ─── User Data Endpoints ──────────────────────────────────────

// Get user's order history
app.get('/api/user/orders', requireAuth, (req, res) => {
    const user = users[req.session.username];
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.orders);
});

// ─── Test Endpoints (Negative Testing) ──────────────────────

app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test.html'));
});

app.get('/sdk-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'sdk-test.html'));
});

// Test: Create order with simulated error
app.post('/api/test/create-order', async (req, res) => {
    const { errorCode, method } = req.body;
    // method: 'mock' (PayPal-Mock-Response header) or 'natural' (trigger real error)
    const testRequestId = `test-create-${errorCode}-${method}-${Math.floor(Date.now() / (30 * 60 * 1000))}`;
    trackInitiated(testRequestId);
    try {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (method === 'natural' && errorCode === 'NOT_AUTHORIZED') {
            // Use invalid token to trigger NOT_AUTHORIZED
            headers['Authorization'] = 'Bearer INVALID_ACCESS_TOKEN_12345';
        } else {
            const accessToken = await getAccessToken();
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        if (method === 'mock') {
            headers['PayPal-Mock-Response'] = JSON.stringify({
                mock_application_codes: errorCode,
            });
        }

        const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    description: 'Test Order',
                    amount: { currency_code: 'USD', value: '1.00' },
                }],
                payment_source: {
                    paypal: {
                        experience_context: {
                            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
                            return_url: 'http://localhost:3666/test',
                            cancel_url: 'http://localhost:3666/test',
                            shipping_preference: 'NO_SHIPPING',
                        },
                    },
                },
            }),
        });

        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { rawBody: text || '(empty)', httpStatus: response.status }; }

        if (!response.ok || data.error || !data.id) {
            orderStats.failed++; saveOrderStats();
        }

        res.json({
            httpStatus: response.status,
            response: data,
            orderStats: { ...orderStats },
        });
    } catch (error) {
        orderStats.failed++; saveOrderStats();
        res.json({
            httpStatus: 500,
            response: { error: error.message },
            orderStats: { ...orderStats },
        });
    }
});

// Test: Capture order with simulated error
app.post('/api/test/capture-order', async (req, res) => {
    const { errorCode, method, orderId } = req.body;
    const testRequestId = `test-capture-${errorCode}-${method}-${Math.floor(Date.now() / (30 * 60 * 1000))}`;
    trackInitiated(testRequestId);
    try {
        const accessToken = await getAccessToken();
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        };

        if (method === 'mock') {
            headers['PayPal-Mock-Response'] = JSON.stringify({
                mock_application_codes: errorCode,
            });
        }

        // For natural errors, use a specific order ID or fake one
        let captureOrderId = orderId || 'FAKE_ORDER_ID';

        // Mock capture needs a real order ID to work
        if (method === 'mock' || (method === 'natural' && errorCode === 'ORDER_NOT_APPROVED')) {
            // Create a real order but don't approve it, then try to capture
            const createRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    intent: 'CAPTURE',
                    purchase_units: [{
                        description: 'Test Unapproved Order',
                        amount: { currency_code: 'USD', value: '1.00' },
                    }],
                    payment_source: {
                        paypal: {
                            experience_context: {
                                payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
                                return_url: 'http://localhost:3666/test',
                                cancel_url: 'http://localhost:3666/test',
                                shipping_preference: 'NO_SHIPPING',
                            },
                        },
                    },
                }),
            });
            const createData = await createRes.json();
            captureOrderId = createData.id || 'UNKNOWN';
        }

        if (method === 'natural' && errorCode === 'RESOURCE_NOT_FOUND') {
            captureOrderId = 'INVALID_ORDER_99999999XX';
        }

        const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${captureOrderId}/capture`, {
            method: 'POST',
            headers,
        });

        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { rawBody: text || '(empty)', httpStatus: response.status }; }

        if (data.status === 'COMPLETED') {
            orderStats.success++; saveOrderStats();
        } else {
            orderStats.failed++; saveOrderStats();
        }

        res.json({
            httpStatus: response.status,
            capturedOrderId: captureOrderId,
            response: data,
            orderStats: { ...orderStats },
        });
    } catch (error) {
        orderStats.failed++; saveOrderStats();
        res.json({
            httpStatus: 500,
            response: { error: error.message },
            orderStats: { ...orderStats },
        });
    }
});

// ─── Admin Endpoints ─────────────────────────────────────────

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Get all users data (admin)
app.get('/api/admin/order-stats', (req, res) => {
    const rate = orderStats.initiated > 0
        ? ((orderStats.success / orderStats.initiated) * 100).toFixed(1)
        : '0.0';
    res.json({ ...orderStats, rate });
});

app.get('/api/admin/users', (req, res) => {
    const result = Object.values(users).map(u => ({
        username: u.username,
        coins: u.coins,
        bonus: u.bonus,
        vipStatus: u.vipStatus,
        savedPaymentMethods: u.savedPaymentMethods || [],
        orders: u.orders || [],
        createdAt: u.createdAt,
    }));
    res.json(result);
});

// List disputes from PayPal
app.get('/api/admin/disputes', async (req, res) => {
    try {
        const accessToken = await getAccessToken();
        const params = new URLSearchParams();

        if (req.query.start_time) params.append('start_time', req.query.start_time);
        if (req.query.dispute_state) params.append('dispute_state', req.query.dispute_state);
        if (req.query.disputed_transaction_id) params.append('disputed_transaction_id', req.query.disputed_transaction_id);
        params.append('page_size', req.query.page_size || '50');

        const url = `${PAYPAL_BASE}/v1/customer/disputes?${params.toString()}`;
        console.log('Fetching disputes:', url);

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        const data = await response.json();

        // Cross-reference disputes with local users by matching transaction IDs to order IDs
        const allOrders = {};
        Object.values(users).forEach(u => {
            (u.orders || []).forEach(o => {
                allOrders[o.id] = { username: u.username, order: o };
            });
        });

        let items = (data.items || []).map(d => {
            // Try to match disputed transactions to our users
            let matchedUser = null;
            let matchedOrder = null;
            (d.disputed_transactions || []).forEach(t => {
                const byCapture = Object.entries(allOrders).find(([, v]) => v.order.captureId === t.seller_transaction_id);
                const byOrder = allOrders[t.seller_transaction_id] || allOrders[t.buyer_transaction_id];
                if (byCapture) {
                    matchedUser = byCapture[1].username;
                    matchedOrder = byCapture[1].order;
                } else if (byOrder) {
                    matchedUser = byOrder.username;
                    matchedOrder = byOrder.order;
                }
            });
            return { ...d, matchedUser, matchedOrder };
        });

        // Filter by end date locally (PayPal sandbox doesn't support update_time_before reliably)
        if (req.query.end_time) {
            const endTime = new Date(req.query.end_time).getTime();
            items = items.filter(d => new Date(d.create_time).getTime() <= endTime);
        }

        res.json({
            items,
            total_items: items.length,
            total_pages: 1,
        });
    } catch (error) {
        console.error('Disputes error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single dispute detail
app.get('/api/admin/disputes/:disputeId', async (req, res) => {
    try {
        const accessToken = await getAccessToken();
        const response = await fetch(`${PAYPAL_BASE}/v1/customer/disputes/${req.params.disputeId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Dispute detail error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search dispute by order ID — look up captures then search disputes
app.get('/api/admin/disputes/search/order/:orderId', async (req, res) => {
    try {
        const accessToken = await getAccessToken();

        // First, get the order details to find the capture/transaction ID
        const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${req.params.orderId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        const orderData = await orderRes.json();

        // Extract capture IDs (transaction IDs)
        const captureIds = [];
        (orderData.purchase_units || []).forEach(pu => {
            (pu.payments?.captures || []).forEach(c => {
                captureIds.push(c.id);
            });
        });

        if (captureIds.length === 0) {
            return res.json({ items: [], total_items: 0, order: orderData });
        }

        // Search disputes for each capture ID
        const allDisputes = [];
        for (const captureId of captureIds) {
            const dRes = await fetch(`${PAYPAL_BASE}/v1/customer/disputes?disputed_transaction_id=${captureId}&page_size=50`, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            const dData = await dRes.json();
            if (dData.items) {
                allDisputes.push(...dData.items);
            }
        }

        // Deduplicate by dispute_id
        const seen = new Set();
        const unique = allDisputes.filter(d => {
            if (seen.has(d.dispute_id)) return false;
            seen.add(d.dispute_id);
            return true;
        });

        res.json({ items: unique, total_items: unique.length, order: orderData, captureIds });
    } catch (error) {
        console.error('Dispute search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─── Server Startup ───────────────────────────────────────────

const PORT = 3666;
app.listen(PORT, () => {
    console.log(`AJCloud Server running at http://localhost:${PORT}`);
    console.log(`PayPal Mode: ${PAYPAL_MODE}`);
});
