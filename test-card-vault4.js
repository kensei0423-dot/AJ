// Test 4: Create order WITHOUT payment_source → confirm-payment-source →
// PATCH to add vault BEFORE capture → capture
// Goal: see if we can add vault attributes after SDK confirm but before capture

const PAYPAL_CLIENT_ID = 'AVkXtxVTYa-8-B3rc3R-V1oDdkKLczfkjQhysVVxdG4aj--k1WOvpfFN5hyP87KE1ve_Tt3tgV7ZgD0y';
const PAYPAL_SECRET = 'EKH_rpKcyiuaoki9p9EDkmqCWtNylpy2B8toZgN-RH3sVULZhaRRA8llOXvJN-bFtVmwsZlQx26y4RDj';
const PAYPAL_BASE = 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
    const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
    });
    return (await res.json()).access_token;
}

async function test() {
    const accessToken = await getAccessToken();

    // Step 1: Create order WITHOUT payment_source
    console.log('=== Step 1: Create order (no payment_source) ===');
    const createRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': `test4-${Date.now()}`,
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{ description: 'Test', amount: { currency_code: 'USD', value: '1.00' } }],
        }),
    });
    const order = await createRes.json();
    console.log('Order:', order.id, 'Status:', order.status);

    // Step 2: Confirm payment source (simulate SDK submit)
    console.log('\n=== Step 2: Confirm payment source ===');
    const confirmRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order.id}/confirm-payment-source`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
                },
            },
        }),
    });
    const confirmData = await confirmRes.json();
    console.log('Status after confirm:', confirmData.status);

    // Step 3: Try PATCH to add vault attributes
    console.log('\n=== Step 3: PATCH to add vault ===');

    // Try different PATCH operations
    const patchOps = [
        // Attempt 1: add to existing payment_source.card
        [{
            op: 'add',
            path: '/payment_source/card/attributes',
            value: { vault: { store_in_vault: 'ON_SUCCESS' } },
        }],
        // Attempt 2: replace payment_source
        // We'll try this if attempt 1 fails
    ];

    for (let i = 0; i < patchOps.length; i++) {
        const patchRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order.id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(patchOps[i]),
        });
        const patchText = await patchRes.text();
        console.log(`  Attempt ${i + 1} - Status: ${patchRes.status}`);
        console.log(`  Response: ${patchText || '(empty - 204 = success)'}`);

        if (patchRes.status === 204) {
            console.log('  PATCH succeeded!');
            break;
        }
    }

    // Step 4: Capture
    console.log('\n=== Step 4: Capture ===');
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order.id}/capture`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });
    const captureData = await captureRes.json();
    console.log('Capture status:', captureData.status);
    console.log('payment_source:', JSON.stringify(captureData.payment_source, null, 2));

    const vault = captureData.payment_source?.card?.attributes?.vault;
    if (vault?.id) {
        console.log('\nSUCCESS: Vault ID =', vault.id);
    } else {
        console.log('\nNo vault ID in capture response');
    }

    // Also test: confirm-payment-source WITH vault attributes
    console.log('\n\n========================================');
    console.log('=== Test 5: confirm-payment-source WITH vault attributes ===');

    const createRes2 = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': `test5-${Date.now()}`,
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{ description: 'Test 5', amount: { currency_code: 'USD', value: '1.00' } }],
        }),
    });
    const order2 = await createRes2.json();
    console.log('Order:', order2.id);

    // Confirm payment source WITH vault attributes included
    const confirmRes2 = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order2.id}/confirm-payment-source`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        }),
    });
    const confirmData2 = await confirmRes2.json();
    console.log('Confirm status:', confirmRes2.status, 'Order status:', confirmData2.status);

    if (confirmData2.status === 'APPROVED' || confirmData2.status === 'COMPLETED') {
        const captureRes2 = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order2.id}/capture`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        });
        const captureData2 = await captureRes2.json();
        console.log('Capture status:', captureData2.status);
        const vault2 = captureData2.payment_source?.card?.attributes?.vault;
        if (vault2?.id) {
            console.log('SUCCESS: Vault ID =', vault2.id);
        } else {
            console.log('No vault ID');
            console.log('payment_source:', JSON.stringify(captureData2.payment_source, null, 2));
        }
    } else {
        console.log('Confirm failed:', JSON.stringify(confirmData2, null, 2));
    }
}

test().catch(e => console.error('Failed:', e));
