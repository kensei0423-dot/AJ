// Test 2: Create order WITHOUT payment_source.card, then check if we can PATCH vault attributes
// This simulates what happens in the ACDC hosted fields flow

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

    // Test A: Create order with payment_source.card (attributes only, no card data)
    console.log('=== Test A: Order with payment_source.card.attributes.vault (no card data) ===');
    const orderBodyA = {
        intent: 'CAPTURE',
        purchase_units: [{ description: 'Test', amount: { currency_code: 'USD', value: '1.00' } }],
        payment_source: {
            card: {
                attributes: {
                    vault: { store_in_vault: 'ON_SUCCESS' },
                },
            },
        },
    };

    const resA = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': `test-a-${Date.now()}`,
        },
        body: JSON.stringify(orderBodyA),
    });
    const orderA = await resA.json();
    console.log('Status:', resA.status);
    console.log('Response:', JSON.stringify(orderA, null, 2));

    // Test B: Create order WITHOUT payment_source at all
    console.log('\n=== Test B: Order WITHOUT payment_source ===');
    const orderBodyB = {
        intent: 'CAPTURE',
        purchase_units: [{ description: 'Test', amount: { currency_code: 'USD', value: '1.00' } }],
    };

    const resB = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': `test-b-${Date.now()}`,
        },
        body: JSON.stringify(orderBodyB),
    });
    const orderB = await resB.json();
    console.log('Status:', resB.status);
    console.log('Order ID:', orderB.id, 'Status:', orderB.status);

    if (orderB.id) {
        // Try to PATCH vault attributes onto this order
        console.log('\n=== Test B2: PATCH vault attributes onto order ===');
        const patchRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderB.id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([{
                op: 'add',
                path: '/payment_source/card/attributes/vault',
                value: { store_in_vault: 'ON_SUCCESS' },
            }]),
        });
        const patchText = await patchRes.text();
        console.log('PATCH status:', patchRes.status);
        console.log('PATCH response:', patchText || '(empty - 204 = success)');
    }
}

test().catch(e => console.error('Test failed:', e));
