// Test: Card vault-with-purchase via PayPal API directly (no SDK)
// This tests whether the PayPal API returns vault info for card payments

const PAYPAL_CLIENT_ID = 'AVkXtxVTYa-8-B3rc3R-V1oDdkKLczfkjQhysVVxdG4aj--k1WOvpfFN5hyP87KE1ve_Tt3tgV7ZgD0y';
const PAYPAL_SECRET = 'EKH_rpKcyiuaoki9p9EDkmqCWtNylpy2B8toZgN-RH3sVULZhaRRA8llOXvJN-bFtVmwsZlQx26y4RDj';
const PAYPAL_BASE = 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
    const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    return data.access_token;
}

async function test() {
    const accessToken = await getAccessToken();
    console.log('Got access token');

    // Step 1: Create order with card data + vault attributes
    console.log('\n=== Step 1: Create order with card + vault ===');
    const orderBody = {
        intent: 'CAPTURE',
        purchase_units: [{
            description: 'Test Card Vault',
            amount: { currency_code: 'USD', value: '1.00' },
        }],
        payment_source: {
            card: {
                number: '4111111111111111',
                expiry: '2027-12',
                security_code: '123',
                name: 'Test User',
                billing_address: {
                    address_line_1: '123 Main St',
                    admin_area_2: 'San Jose',
                    admin_area_1: 'CA',
                    postal_code: '95131',
                    country_code: 'US',
                },
                attributes: {
                    vault: {
                        store_in_vault: 'ON_SUCCESS',
                    },
                },
            },
        },
    };

    console.log('Order body:', JSON.stringify(orderBody, null, 2));

    const createRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': `test-card-vault-${Date.now()}`,
        },
        body: JSON.stringify(orderBody),
    });

    const order = await createRes.json();
    console.log('\nOrder response status:', createRes.status);
    console.log('Order response:', JSON.stringify(order, null, 2));

    if (!order.id) {
        console.log('\nFAILED: No order ID returned');
        return;
    }

    // For card with full data, order should be auto-approved
    console.log('\nOrder ID:', order.id);
    console.log('Order status:', order.status);

    // Step 2: Capture the order
    if (order.status === 'COMPLETED') {
        console.log('\nOrder already COMPLETED (auto-captured)');
        console.log('payment_source:', JSON.stringify(order.payment_source, null, 2));

        // Check for vault info
        const vault = order.payment_source?.card?.attributes?.vault;
        console.log('\n=== Vault Info ===');
        console.log('vault:', JSON.stringify(vault, null, 2));
        if (vault?.id) {
            console.log('SUCCESS: Vault ID =', vault.id);
            console.log('Customer:', JSON.stringify(vault.customer));
        } else {
            console.log('NO VAULT ID in response');
        }
    } else {
        console.log('\n=== Step 2: Capture order ===');
        const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order.id}/capture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const capture = await captureRes.json();
        console.log('Capture status:', captureRes.status);
        console.log('Capture response:', JSON.stringify(capture, null, 2));

        // Check for vault info
        const vault = capture.payment_source?.card?.attributes?.vault;
        console.log('\n=== Vault Info ===');
        console.log('vault:', JSON.stringify(vault, null, 2));
        if (vault?.id) {
            console.log('SUCCESS: Vault ID =', vault.id);
            console.log('Customer:', JSON.stringify(vault.customer));
        } else {
            console.log('NO VAULT ID in capture response');
            console.log('Full payment_source:', JSON.stringify(capture.payment_source, null, 2));
        }
    }
}

test().catch(e => console.error('Test failed:', e));
