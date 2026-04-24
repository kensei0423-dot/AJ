const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();

// Theme
const DARK_BG = '0F172A';
const SURFACE = '1E293B';
const ACCENT = 'F59E0B';
const TEXT = 'F1F5F9';
const TEXT_SEC = '94A3B8';
const TEXT_DIM = '64748B';
const BORDER = '334155';
const SUCCESS = '10B981';
const ERROR = 'EF4444';
const INFO = '3B82F6';

pptx.author = 'ReelShort';
pptx.title = 'ReelShort Payment Flow';
pptx.layout = 'LAYOUT_WIDE';

function addTitle(slide, title, subtitle) {
    slide.background = { color: DARK_BG };
    slide.addText(title, {
        x: 0.8, y: 0.3, w: '90%', h: 0.6,
        fontSize: 28, fontFace: 'Arial', color: TEXT, bold: true,
    });
    if (subtitle) {
        slide.addText(subtitle, {
            x: 0.8, y: 0.85, w: '90%', h: 0.4,
            fontSize: 14, fontFace: 'Arial', color: TEXT_SEC,
        });
    }
    // accent bar
    slide.addShape(pptx.ShapeType.rect, {
        x: 0.8, y: 0.95, w: 0.6, h: 0.04, fill: { color: ACCENT },
    });
}

function addBullets(slide, items, startY, opts = {}) {
    const x = opts.x || 0.8;
    const w = opts.w || '85%';
    const fontSize = opts.fontSize || 13;
    const rows = items.map(item => {
        if (typeof item === 'string') {
            return [{ text: item, options: { fontSize, fontFace: 'Arial', color: TEXT, bullet: { code: '2022' }, paraSpaceAfter: 6 } }];
        }
        return item;
    });
    const flat = rows.map(r => Array.isArray(r) ? r : [r]).flat();
    slide.addText(flat, { x, y: startY, w, h: 'auto', valign: 'top' });
}

function addTable(slide, headers, rows, startY, opts = {}) {
    const colW = opts.colW || undefined;
    const x = opts.x || 0.8;
    const tableRows = [];

    // Header row
    tableRows.push(headers.map(h => ({
        text: h, options: { fontSize: 11, fontFace: 'Arial', color: DARK_BG, bold: true, align: 'left', valign: 'middle' }
    })));

    // Data rows
    for (const row of rows) {
        tableRows.push(row.map(cell => ({
            text: cell, options: { fontSize: 10, fontFace: 'Arial', color: TEXT, align: 'left', valign: 'middle' }
        })));
    }

    const tableOpts = {
        x, y: startY, w: opts.w || 11.5,
        border: { type: 'solid', pt: 0.5, color: BORDER },
        rowH: 0.35,
        autoPage: false,
        colW,
    };

    // Header fill
    tableOpts.fill = { color: SURFACE };

    slide.addTable(tableRows, tableOpts);
}

function addCodeBlock(slide, text, x, y, w, h) {
    slide.addText(text, {
        x, y, w, h,
        fontSize: 9, fontFace: 'Courier New', color: TEXT,
        fill: { color: SURFACE },
        border: { type: 'solid', pt: 0.5, color: BORDER },
        valign: 'top',
        paraSpaceBefore: 2, paraSpaceAfter: 2,
        margin: [8, 10, 8, 10],
    });
}

// ─── SLIDE 1: Title ───
{
    const slide = pptx.addSlide();
    slide.background = { color: DARK_BG };
    slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: '100%', h: '100%',
        fill: { color: DARK_BG },
    });
    slide.addText('ReelShort', {
        x: 1.5, y: 1.5, w: 10, h: 1,
        fontSize: 48, fontFace: 'Arial', color: TEXT, bold: true,
    });
    slide.addText('Payment Flow', {
        x: 1.5, y: 2.5, w: 10, h: 0.8,
        fontSize: 36, fontFace: 'Arial', color: ACCENT, bold: true,
    });
    slide.addShape(pptx.ShapeType.rect, {
        x: 1.5, y: 3.5, w: 1, h: 0.06, fill: { color: ACCENT },
    });
    slide.addText('PayPal Integration  |  Vault  |  Subscriptions', {
        x: 1.5, y: 3.8, w: 10, h: 0.5,
        fontSize: 16, fontFace: 'Arial', color: TEXT_SEC,
    });
    slide.addText('sandbox  •  server.js :3777', {
        x: 1.5, y: 6.5, w: 10, h: 0.4,
        fontSize: 12, fontFace: 'Arial', color: TEXT_DIM,
    });
}

// ─── SLIDE 2: Architecture Overview ───
{
    const slide = pptx.addSlide();
    addTitle(slide, 'Architecture Overview', 'Frontend → Backend → PayPal API');

    // Frontend box
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y: 1.5, w: 4.5, h: 2.2,
        fill: { color: SURFACE }, border: { type: 'solid', pt: 1, color: BORDER }, rectRadius: 0.1,
    });
    slide.addText('Frontend (index.html)', {
        x: 0.7, y: 1.55, w: 4, h: 0.35, fontSize: 13, fontFace: 'Arial', color: ACCENT, bold: true,
    });
    slide.addText([
        { text: 'Custom PayPal Button', options: { fontSize: 11, color: TEXT, bullet: { code: '25B6' }, paraSpaceAfter: 3 } },
        { text: 'PayPal JS SDK v6 — Headless API', options: { fontSize: 9, color: TEXT_SEC, indentLevel: 1, paraSpaceAfter: 6 } },
        { text: 'Standard PayPal Button', options: { fontSize: 11, color: TEXT, bullet: { code: '25B6' }, paraSpaceAfter: 3 } },
        { text: 'Classic SDK — SDK-rendered UI', options: { fontSize: 9, color: TEXT_SEC, indentLevel: 1 } },
    ], { x: 0.7, y: 1.95, w: 4, h: 1.5 });

    // Backend box
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y: 4.2, w: 4.5, h: 2.8,
        fill: { color: SURFACE }, border: { type: 'solid', pt: 1, color: BORDER }, rectRadius: 0.1,
    });
    slide.addText('Backend (server.js :3777)', {
        x: 0.7, y: 4.25, w: 4, h: 0.35, fontSize: 13, fontFace: 'Arial', color: ACCENT, bold: true,
    });
    slide.addText([
        { text: 'POST /api/orders — Create order', options: { fontSize: 9, color: TEXT, fontFace: 'Courier New', paraSpaceAfter: 3 } },
        { text: 'POST /api/orders/:id/capture — Capture', options: { fontSize: 9, color: TEXT, fontFace: 'Courier New', paraSpaceAfter: 3 } },
        { text: 'POST /api/orders/saved — Vault payment', options: { fontSize: 9, color: TEXT, fontFace: 'Courier New', paraSpaceAfter: 3 } },
        { text: 'GET  /api/client-token — id_token', options: { fontSize: 9, color: TEXT, fontFace: 'Courier New', paraSpaceAfter: 3 } },
        { text: 'POST /api/vault/* — Setup/payment tokens', options: { fontSize: 9, color: TEXT, fontFace: 'Courier New', paraSpaceAfter: 3 } },
        { text: 'POST /api/subscription/* — VIP mgmt', options: { fontSize: 9, color: TEXT, fontFace: 'Courier New' } },
    ], { x: 0.7, y: 4.65, w: 4, h: 2.2 });

    // Arrow down
    slide.addShape(pptx.ShapeType.rect, { x: 2.6, y: 3.7, w: 0.06, h: 0.5, fill: { color: ACCENT } });
    slide.addText('▼', { x: 2.35, y: 3.9, w: 0.5, h: 0.3, fontSize: 14, color: ACCENT });

    // PayPal API box
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 7, y: 2, w: 5.5, h: 4.5,
        fill: { color: SURFACE }, border: { type: 'solid', pt: 1, color: INFO }, rectRadius: 0.1,
    });
    slide.addText('PayPal API (sandbox)', {
        x: 7.2, y: 2.05, w: 5, h: 0.35, fontSize: 13, fontFace: 'Arial', color: INFO, bold: true,
    });
    slide.addText([
        { text: '/v1/oauth2/token', options: { fontSize: 10, color: TEXT, fontFace: 'Courier New', paraSpaceAfter: 2 } },
        { text: 'Access token / id_token', options: { fontSize: 9, color: TEXT_SEC, indentLevel: 1, paraSpaceAfter: 6 } },
        { text: '/v2/checkout/orders', options: { fontSize: 10, color: TEXT, fontFace: 'Courier New', paraSpaceAfter: 2 } },
        { text: 'Create & capture orders', options: { fontSize: 9, color: TEXT_SEC, indentLevel: 1, paraSpaceAfter: 6 } },
        { text: '/v3/vault/setup-tokens', options: { fontSize: 10, color: TEXT, fontFace: 'Courier New', paraSpaceAfter: 2 } },
        { text: 'Vault setup token', options: { fontSize: 9, color: TEXT_SEC, indentLevel: 1, paraSpaceAfter: 6 } },
        { text: '/v3/vault/payment-tokens', options: { fontSize: 10, color: TEXT, fontFace: 'Courier New', paraSpaceAfter: 2 } },
        { text: 'Create / delete payment token', options: { fontSize: 9, color: TEXT_SEC, indentLevel: 1 } },
    ], { x: 7.2, y: 2.5, w: 5, h: 3.5 });

    // Arrow right
    slide.addShape(pptx.ShapeType.rect, { x: 5, y: 4.5, w: 2, h: 0.04, fill: { color: ACCENT } });
    slide.addText('►', { x: 6.6, y: 4.25, w: 0.5, h: 0.5, fontSize: 16, color: ACCENT });
}

// ─── SLIDE 3: Two SDKs ───
{
    const slide = pptx.addSlide();
    addTitle(slide, 'Two SDKs', 'Custom PayPal Button vs Standard PayPal Button');

    addTable(slide,
        ['', 'Custom PayPal Button', 'Standard PayPal Button'],
        [
            ['SDK', 'PayPal JS SDK v6 (web-sdk/v6/core)', 'PayPal Classic SDK (sdk/js)'],
            ['Global', 'paypal', 'paypalClassic (data-namespace)'],
            ['Button', 'Custom HTML <button> (black bg)', 'paypalClassic.Buttons().render() (gold)'],
            ['Popup trigger', 'session.start()', 'SDK manages internally'],
            ['Returning payer', 'vault_id, no popup', 'data-user-id-token, popup pre-filled'],
            ['Card funding', 'N/A (custom button)', 'Disabled (disable-funding=card)'],
        ],
        1.4,
        { colW: [2, 4.5, 4.5] }
    );
}

// ─── SLIDE 4: Page Init Sequence ───
{
    const slide = pptx.addSlide();
    addTitle(slide, 'Page Init Sequence', 'Store page load flow');

    addCodeBlock(slide,
        `checkAuth()
  ├── initPayPal()                    // Init SDK v6 instance
  ├── await loadSavedMethods()        // GET /api/vault/payment-methods
  │     └── updatePayPalButton()      // Show email if returning payer
  │                                   // Hide save checkbox if returning
  └── initPayPalClassic()
        ├── (if returning) GET /api/client-token?customer_id=xxx
        │     └── Server: POST /v1/oauth2/token
        │           (response_type=id_token, target_customer_id)
        │           → returns JWT id_token
        ├── loadPayPalClassicSDK(idToken)
        │     └── <script src="sdk/js?...&disable-funding=card"
        │              data-namespace="paypalClassic"
        │              data-user-id-token="eyJ...">
        └── renderPayPalButtons()`,
        0.8, 1.4, 11.5, 4.2
    );
}

// ─── SLIDE 5: Flow 1 — New Payer Custom Button ───
{
    const slide = pptx.addSlide();
    addTitle(slide, 'Flow 1: New Payer — Custom Button (SDK v6)', 'First-time purchase with vault-with-purchase');

    const steps = [
        { text: '1. User selects product → clicks Custom PayPal button', options: { fontSize: 12, color: TEXT, bold: true, paraSpaceAfter: 4 } },
        { text: '2. Client → POST /api/orders { productId, savePaymentMethod: true }', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 2 } },
        { text: '   Server → POST /v2/checkout/orders with vault attributes', options: { fontSize: 10, color: TEXT_SEC, paraSpaceAfter: 6 } },
        { text: '3. SDK: createPayPalOneTimePaymentSession → session.start()', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 2 } },
        { text: '   Opens PayPal popup for user approval', options: { fontSize: 10, color: TEXT_SEC, paraSpaceAfter: 6 } },
        { text: '4. Client → POST /api/orders/:id/capture', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 2 } },
        { text: '   Response includes vault { id, customer.id }', options: { fontSize: 10, color: TEXT_SEC, paraSpaceAfter: 6 } },
        { text: '5. Server: creditUser() → coins/bonus/VIP', options: { fontSize: 11, color: SUCCESS, paraSpaceAfter: 2 } },
        { text: '6. Server: Save payment method → savedPaymentMethods[]', options: { fontSize: 11, color: INFO, paraSpaceAfter: 6 } },
        { text: '7. Client: showSuccessModal() + refreshBalance() + loadSavedMethods()', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 4 } },
    ];
    slide.addText(steps, { x: 0.8, y: 1.3, w: 11.5, h: 5.5 });
}

// ─── SLIDE 6: Flow 2 — Returning Payer Custom Button ───
{
    const slide = pptx.addSlide();
    addTitle(slide, 'Flow 2: Returning Payer — Custom Button', 'vault_id payment — no popup required');

    const steps = [
        { text: '1. User selects product → clicks Custom PayPal button', options: { fontSize: 12, color: TEXT, bold: true, paraSpaceAfter: 4 } },
        { text: '   savedMethods.length > 0 → returning payer flow', options: { fontSize: 10, color: TEXT_SEC, paraSpaceAfter: 6 } },
        { text: '2. Client → POST /api/orders/saved', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 2 } },
        { text: '   Body: { productId, paymentTokenId }', options: { fontSize: 10, color: TEXT_SEC, paraSpaceAfter: 6 } },
        { text: '3. Server verifies token belongs to user', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 6 } },
        { text: '4. Server → POST /v2/checkout/orders with vault_id', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 2 } },
        { text: '   Headers: PayPal-Request-Id required', options: { fontSize: 10, color: TEXT_SEC, paraSpaceAfter: 2 } },
        { text: '   Auto-approved + auto-captured → status: COMPLETED', options: { fontSize: 10, color: SUCCESS, bold: true, paraSpaceAfter: 6 } },
        { text: '5. Server: creditUser() → coins/bonus/VIP', options: { fontSize: 11, color: SUCCESS, paraSpaceAfter: 6 } },
        { text: '6. Client: showSuccessModal() + refreshBalance()', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 4 } },
    ];
    slide.addText(steps, { x: 0.8, y: 1.3, w: 11.5, h: 5.5 });

    // Highlight box
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 8, y: 1.3, w: 4.2, h: 1.2,
        fill: { color: '1a3a1a' }, border: { type: 'solid', pt: 1, color: SUCCESS }, rectRadius: 0.1,
    });
    slide.addText('NO POPUP\nInstant payment', {
        x: 8.2, y: 1.4, w: 3.8, h: 1,
        fontSize: 16, fontFace: 'Arial', color: SUCCESS, bold: true, align: 'center', valign: 'middle',
    });
}

// ─── SLIDE 7: Flow 3 — New Payer Standard Button ───
{
    const slide = pptx.addSlide();
    addTitle(slide, 'Flow 3: New Payer — Standard Button (Classic SDK)', 'SDK-rendered button, same server flow as Flow 1');

    const steps = [
        { text: '1. User clicks Standard PayPal button (gold, SDK-rendered)', options: { fontSize: 12, color: TEXT, bold: true, paraSpaceAfter: 4 } },
        { text: '   Credit/debit card funding disabled', options: { fontSize: 10, color: TEXT_SEC, paraSpaceAfter: 6 } },
        { text: '2. SDK → createOrder callback', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 2 } },
        { text: '   Client → POST /api/orders { productId, savePaymentMethod }', options: { fontSize: 10, color: TEXT_SEC, paraSpaceAfter: 2 } },
        { text: '   Server → POST /v2/checkout/orders (shipping: NO_SHIPPING)', options: { fontSize: 10, color: TEXT_SEC, paraSpaceAfter: 2 } },
        { text: '   Returns ORDER_ID to SDK', options: { fontSize: 10, color: TEXT_SEC, paraSpaceAfter: 6 } },
        { text: '3. SDK opens popup → user approves', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 6 } },
        { text: '4. SDK → onApprove callback → { orderID }', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 2 } },
        { text: '   Client → POST /api/orders/:id/capture', options: { fontSize: 10, color: TEXT_SEC, paraSpaceAfter: 6 } },
        { text: '5. Server: creditUser() + save vault info (if enabled)', options: { fontSize: 11, color: SUCCESS, paraSpaceAfter: 6 } },
        { text: '6. Client: showSuccessModal() + refreshBalance()', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 4 } },
    ];
    slide.addText(steps, { x: 0.8, y: 1.3, w: 11.5, h: 5.5 });
}

// ─── SLIDE 8: Flow 4 — Returning Payer Standard Button ───
{
    const slide = pptx.addSlide();
    addTitle(slide, 'Flow 4: Returning Payer — Standard Button', 'id_token + pre-filled popup experience');

    const steps = [
        { text: 'Page Load: initPayPalClassic()', options: { fontSize: 13, color: ACCENT, bold: true, paraSpaceAfter: 6 } },
        { text: '1. Client → GET /api/client-token?customer_id=xxx', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 2 } },
        { text: '   Server → POST /v1/oauth2/token', options: { fontSize: 10, color: TEXT_SEC, paraSpaceAfter: 2 } },
        { text: '   grant_type=client_credentials & response_type=id_token', options: { fontSize: 9, color: TEXT_DIM, paraSpaceAfter: 2 } },
        { text: '   & target_customer_id=CUSTOMER_ID', options: { fontSize: 9, color: TEXT_DIM, paraSpaceAfter: 2 } },
        { text: '   → returns JWT id_token (eyJ...)', options: { fontSize: 10, color: INFO, paraSpaceAfter: 6 } },
        { text: '2. Load SDK with data-user-id-token attribute', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 2 } },
        { text: '   <script src="sdk/js?...&disable-funding=card"', options: { fontSize: 9, color: TEXT_SEC, fontFace: 'Courier New', paraSpaceAfter: 1 } },
        { text: '     data-user-id-token="eyJraWQ...">', options: { fontSize: 9, color: TEXT_SEC, fontFace: 'Courier New', paraSpaceAfter: 6 } },
        { text: '3. renderPayPalButtons()', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 6 } },
        { text: '4. User clicks → Same as Flow 3 but popup pre-fills saved info', options: { fontSize: 11, color: SUCCESS, paraSpaceAfter: 4 } },
    ];
    slide.addText(steps, { x: 0.8, y: 1.3, w: 11.5, h: 5.5 });
}

// ─── SLIDE 9: Vault with Purchase ───
{
    const slide = pptx.addSlide();
    addTitle(slide, 'Vault with Purchase', 'Save PayPal account during a normal payment');

    const steps = [
        { text: 'Trigger', options: { fontSize: 14, color: ACCENT, bold: true, paraSpaceAfter: 4 } },
        { text: '"Save payment method" checkbox (default: checked)', options: { fontSize: 12, color: TEXT, bullet: { code: '2022' }, paraSpaceAfter: 2 } },
        { text: 'Hidden when user already has a saved method', options: { fontSize: 12, color: TEXT, bullet: { code: '2022' }, paraSpaceAfter: 8 } },

        { text: 'Server: POST /api/orders', options: { fontSize: 14, color: ACCENT, bold: true, paraSpaceAfter: 4 } },
        { text: 'Adds payment_source.paypal.attributes.vault to order body', options: { fontSize: 12, color: TEXT, bullet: { code: '2022' }, paraSpaceAfter: 2 } },
        { text: 'store_in_vault: "ON_SUCCESS", usage_type: "MERCHANT"', options: { fontSize: 10, color: TEXT_SEC, indentLevel: 1, paraSpaceAfter: 8 } },

        { text: 'Capture Response', options: { fontSize: 14, color: ACCENT, bold: true, paraSpaceAfter: 4 } },
        { text: 'payment_source.paypal.attributes.vault', options: { fontSize: 12, color: TEXT, bullet: { code: '2022' }, paraSpaceAfter: 2 } },
        { text: '→ { id: "PAYMENT_TOKEN_ID", customer: { id: "CUSTOMER_ID" } }', options: { fontSize: 10, color: SUCCESS, indentLevel: 1, paraSpaceAfter: 8 } },

        { text: 'Storage', options: { fontSize: 14, color: ACCENT, bold: true, paraSpaceAfter: 4 } },
        { text: 'user.savedPaymentMethods.push({ paymentTokenId, customerId, email, savedAt })', options: { fontSize: 10, color: TEXT, fontFace: 'Courier New', paraSpaceAfter: 2 } },
    ];
    slide.addText(steps, { x: 0.8, y: 1.3, w: 11.5, h: 5.5 });
}

// ─── SLIDE 10: Saved Payment Method ───
{
    const slide = pptx.addSlide();
    addTitle(slide, 'Saved Payment Method', 'Data model & delete flow');

    addTable(slide,
        ['Field', 'Source', 'Usage'],
        [
            ['paymentTokenId', 'vault.id from capture response', 'Used as vault_id in Flow 2'],
            ['customerId', 'vault.customer.id from capture', 'Used to generate id_token in Flow 4'],
            ['email', 'payment_source.paypal.email_address', 'Displayed on custom button'],
            ['savedAt', 'Server timestamp', 'Display in profile'],
        ],
        1.4,
        { colW: [2.5, 4.5, 4.5] }
    );

    slide.addText('Delete Flow', {
        x: 0.8, y: 3.6, w: 5, h: 0.4,
        fontSize: 16, fontFace: 'Arial', color: ACCENT, bold: true,
    });

    const deleteSteps = [
        { text: '1. User clicks "Delete" → styled confirmation modal', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 3 } },
        { text: '   "Your subscription will not be able to auto-renew"', options: { fontSize: 10, color: ERROR, paraSpaceAfter: 6 } },
        { text: '2. [Remove Anyway] → DELETE /api/vault/payment-methods/:id', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 3 } },
        { text: '3. Server → DELETE /v3/vault/payment-tokens/:id (PayPal)', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 3 } },
        { text: '4. Remove from user.savedPaymentMethods[] → reload page', options: { fontSize: 11, color: TEXT, paraSpaceAfter: 3 } },
    ];
    slide.addText(deleteSteps, { x: 0.8, y: 4, w: 11.5, h: 2.5 });
}

// ─── SLIDE 11: Subscription Management ───
{
    const slide = pptx.addSlide();
    addTitle(slide, 'Subscription Management', 'Change plan, cancel with retention, weekly renewal');

    // Change Plan
    slide.addText('Change Plan', {
        x: 0.8, y: 1.3, w: 3, h: 0.35, fontSize: 14, color: ACCENT, bold: true,
    });
    slide.addText([
        { text: 'POST /api/subscription/change', options: { fontSize: 10, color: TEXT, fontFace: 'Courier New', paraSpaceAfter: 2 } },
        { text: '{ newPlan: "weekly_vip" | "yearly_vip" }', options: { fontSize: 9, color: TEXT_SEC, fontFace: 'Courier New', paraSpaceAfter: 2 } },
        { text: 'Replaces current plan immediately', options: { fontSize: 10, color: TEXT_SEC, paraSpaceAfter: 2 } },
    ], { x: 0.8, y: 1.7, w: 3.5, h: 1.2 });

    // Cancel with Retention
    slide.addText('Cancel → Retention Offer (2%)', {
        x: 4.8, y: 1.3, w: 4, h: 0.35, fontSize: 14, color: ACCENT, bold: true,
    });
    slide.addText([
        { text: 'Modal shows original vs discounted price', options: { fontSize: 10, color: TEXT, paraSpaceAfter: 3 } },
        { text: '[Accept Offer & Stay VIP]', options: { fontSize: 10, color: SUCCESS, bold: true, paraSpaceAfter: 2 } },
        { text: '→ POST /api/subscription/renew-discount', options: { fontSize: 9, color: TEXT_SEC, fontFace: 'Courier New', paraSpaceAfter: 3 } },
        { text: '[No thanks, cancel anyway]', options: { fontSize: 10, color: ERROR, bold: true, paraSpaceAfter: 2 } },
        { text: '→ POST /api/subscription/cancel', options: { fontSize: 9, color: TEXT_SEC, fontFace: 'Courier New', paraSpaceAfter: 2 } },
    ], { x: 4.8, y: 1.7, w: 4, h: 2 });

    // Weekly Renewal
    slide.addText('Weekly Renewal (5% off)', {
        x: 9.3, y: 1.3, w: 3.5, h: 0.35, fontSize: 14, color: ACCENT, bold: true,
    });
    slide.addText([
        { text: 'Weekly VIP users see renew button', options: { fontSize: 10, color: TEXT, paraSpaceAfter: 3 } },
        { text: '"Renew $18.99/week -5%"', options: { fontSize: 10, color: SUCCESS, bold: true, paraSpaceAfter: 3 } },
        { text: 'POST /api/subscription/renew-discount', options: { fontSize: 9, color: TEXT_SEC, fontFace: 'Courier New', paraSpaceAfter: 2 } },
        { text: '{ plan, discountRate: 0.05 }', options: { fontSize: 9, color: TEXT_SEC, fontFace: 'Courier New', paraSpaceAfter: 2 } },
    ], { x: 9.3, y: 1.7, w: 3.5, h: 1.5 });

    // Discount rate table
    slide.addText('Allowed Discount Rates (server-validated)', {
        x: 0.8, y: 4.2, w: 5, h: 0.35, fontSize: 14, color: ACCENT, bold: true,
    });
    addTable(slide,
        ['Rate', 'Source', 'Usage'],
        [
            ['2% (0.02)', 'Cancel retention offer', 'Default if rate not specified'],
            ['5% (0.05)', 'Weekly renewal button', 'Must be explicitly passed'],
        ],
        4.6,
        { colW: [2, 4, 5.5], w: 11.5 }
    );
}

// ─── SLIDE 12: Product Catalog ───
{
    const slide = pptx.addSlide();
    addTitle(slide, 'Product Catalog', 'VIP Subscriptions & Coin Packages');

    slide.addText('VIP Subscriptions', {
        x: 0.8, y: 1.3, w: 5, h: 0.35, fontSize: 14, color: ACCENT, bold: true,
    });
    addTable(slide,
        ['Product ID', 'Name', 'Price', 'Duration'],
        [
            ['weekly_vip', 'Weekly VIP', '$19.99', '7 days'],
            ['yearly_vip', 'Yearly VIP', '$199.99', '365 days'],
        ],
        1.7,
        { colW: [2.5, 3, 2, 2], w: 9.5 }
    );

    slide.addText('Coin Packages', {
        x: 0.8, y: 3, w: 5, h: 0.35, fontSize: 14, color: ACCENT, bold: true,
    });
    addTable(slide,
        ['Product ID', 'Name', 'Price', 'Coins', 'Bonus'],
        [
            ['coins_500', '500 Coins', '$4.99', '500', '0'],
            ['coins_1100', '1,100 Coins', '$9.99', '1,000', '100 (+10%)'],
            ['coins_2400', '2,400 Coins', '$19.99', '2,000', '400 (+20%)'],
            ['coins_3900', '3,900 Coins', '$29.99', '3,000', '900 (+30%)'],
            ['coins_7500', '7,500 Coins', '$49.99', '5,000', '2,500 (+50%)'],
            ['coins_20000', '20,000 Coins', '$99.99', '10,000', '10,000 (+100%)'],
        ],
        3.4,
        { colW: [2.5, 2.5, 1.5, 1.5, 2.5], w: 10.5 }
    );
}

// ─── SLIDE 13: API Endpoints ───
{
    const slide = pptx.addSlide();
    addTitle(slide, 'API Endpoints', 'All backend routes');

    slide.addText('Auth', { x: 0.8, y: 1.25, w: 2, h: 0.3, fontSize: 12, color: ACCENT, bold: true });
    addTable(slide,
        ['Method', 'Path', 'Auth', 'Description'],
        [
            ['POST', '/auth/register', 'No', 'Register new user'],
            ['POST', '/auth/login', 'No', 'Login'],
            ['POST', '/auth/logout', 'Yes', 'Logout'],
            ['GET', '/auth/me', 'Yes', 'Get current user'],
        ],
        1.55, { colW: [1, 3.2, 0.8, 3], w: 8 }
    );

    slide.addText('Payment', { x: 0.8, y: 3.3, w: 2, h: 0.3, fontSize: 12, color: ACCENT, bold: true });
    addTable(slide,
        ['Method', 'Path', 'Description'],
        [
            ['GET', '/api/client-token', 'Generate client token / id_token'],
            ['POST', '/api/orders', 'Create PayPal order (NO_SHIPPING)'],
            ['POST', '/api/orders/:id/capture', 'Capture approved order'],
            ['POST', '/api/orders/saved', 'Pay with vault_id (no popup)'],
        ],
        3.6, { colW: [1, 3.5, 5], w: 9.5 }
    );

    slide.addText('Vault & Subscription', { x: 0.8, y: 5.4, w: 3, h: 0.3, fontSize: 12, color: ACCENT, bold: true });
    addTable(slide,
        ['Method', 'Path', 'Description'],
        [
            ['POST', '/api/vault/setup-token', 'Create vault setup token'],
            ['POST', '/api/vault/payment-token', 'Create payment token'],
            ['GET', '/api/vault/payment-methods', 'List saved methods'],
            ['DELETE', '/api/vault/payment-methods/:id', 'Delete saved method'],
            ['POST', '/api/subscription/change', 'Switch VIP plan'],
            ['POST', '/api/subscription/cancel', 'Cancel VIP'],
            ['POST', '/api/subscription/renew-discount', 'Renew with discount'],
        ],
        5.7, { colW: [1, 4, 5], w: 10 }
    );
}

// ─── SLIDE 14: Flow Comparison ───
{
    const slide = pptx.addSlide();
    addTitle(slide, 'Flow Comparison', 'All 4 payment flows at a glance');

    addTable(slide,
        ['', 'Custom (New)', 'Custom (Returning)', 'Standard (New)', 'Standard (Returning)'],
        [
            ['SDK', 'v6 headless', 'v6 headless', 'Classic sdk/js', 'Classic + id_token'],
            ['Popup', 'Yes', 'No', 'Yes', 'Yes (pre-filled)'],
            ['Create order', 'POST /api/orders', 'POST /api/orders/saved', 'POST /api/orders', 'POST /api/orders'],
            ['Payment src', 'paypal + vault', 'paypal.vault_id', 'paypal + vault', 'paypal + vault'],
            ['Capture', 'Client /capture', 'Server auto', 'Client /capture', 'Client /capture'],
            ['Vault save', 'On capture', 'N/A (saved)', 'On capture', 'On capture'],
            ['id_token', 'No', 'No', 'No', 'Yes'],
            ['Shipping', 'NO_SHIPPING', 'N/A', 'NO_SHIPPING', 'NO_SHIPPING'],
        ],
        1.4,
        { colW: [1.8, 2.3, 2.3, 2.3, 2.8] }
    );
}

// ─── Generate ───
const outputPath = '/Users/haolu/Desktop/vscode-2026/reelshort/payment.pptx';
pptx.writeFile({ fileName: outputPath })
    .then(() => console.log('Generated:', outputPath))
    .catch(err => console.error('Error:', err));
