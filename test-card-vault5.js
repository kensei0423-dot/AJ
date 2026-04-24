// Test 5: Simulate exact ACDC flow WITH SCA_ALWAYS verification
// 1. Create order with payment_source.card.attributes.vault + verification (no card data)
// 2. Confirm payment source with card data (simulating SDK submit)
// 3. Capture
// 4. Check for vault info at EACH step

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

    // ========== Test A: With SCA_ALWAYS (matching current server.js) ==========
    console.log('========================================');
    console.log('Test A: vault + SCA_ALWAYS (current server.js config)');
    console.log('========================================');

    // Step 1: Create order with vault + SCA_ALWAYS (no card data)
    console.log('\n=== Step 1: Create order ===');
    const orderBody = {
        intent: 'CAPTURE',
        purchase_units: [{ description: 'Test ACDC Vault SCA', amount: { currency_code: 'USD', value: '1.00' } }],
        payment_source: {
            card: {
                attributes: {
                    vault: { store_in_vault: 'ON_SUCCESS' },
                    verification: { method: 'SCA_ALWAYS' },
                },
            },
        },
    };
    console.log('Request body:', JSON.stringify(orderBody, null, 2));

    const createRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': `test5a-${Date.now()}`,
        },
        body: JSON.stringify(orderBody),
    });
    const order = await createRes.json();
    console.log('Create status:', createRes.status);
    console.log('Order ID:', order.id, '- Status:', order.status);
    if (order.details) console.log('Error details:', JSON.stringify(order.details, null, 2));
    if (!order.id) {
        console.log('FULL response:', JSON.stringify(order, null, 2));
        return;
    }

    // Step 2: GET order to see current state
    console.log('\n=== Step 1b: GET order to check state ===');
    const getRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order.id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const getOrder = await getRes.json();
    console.log('Order state:', getOrder.status);
    console.log('payment_source:', JSON.stringify(getOrder.payment_source, null, 2));

    // Step 3: Confirm payment source with card data (simulating SDK submit)
    console.log('\n=== Step 2: Confirm payment source (simulate SDK submit) ===');
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
    console.log('Confirm HTTP status:', confirmRes.status);
    console.log('Order status after confirm:', confirmData.status);
    console.log('payment_source after confirm:', JSON.stringify(confirmData.payment_source, null, 2));

    if (confirmData.status !== 'APPROVED' && confirmData.status !== 'COMPLETED') {
        console.log('\nConfirm failed! Full response:', JSON.stringify(confirmData, null, 2));
        return;
    }

    // Step 4: Capture
    console.log('\n=== Step 3: Capture ===');
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order.id}/capture`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });
    const captureData = await captureRes.json();
    console.log('Capture HTTP status:', captureRes.status);
    console.log('Order status:', captureData.status);
    console.log('payment_source:', JSON.stringify(captureData.payment_source, null, 2));

    const vault = captureData.payment_source?.card?.attributes?.vault;
    console.log('\n=== RESULT ===');
    if (vault?.id) {
        console.log('SUCCESS: Vault ID =', vault.id);
        console.log('Customer:', JSON.stringify(vault.customer));
    } else {
        console.log('FAIL: No vault ID in capture response');
    }

    // ========== Test B: confirm-payment-source WITH vault+SCA attributes ==========
    console.log('\n\n========================================');
    console.log('Test B: confirm-payment-source WITH vault+SCA in confirm body');
    console.log('========================================');

    const createRes2 = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': `test5b-${Date.now()}`,
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{ description: 'Test B', amount: { currency_code: 'USD', value: '1.00' } }],
            // NO payment_source in order creation
        }),
    });
    const order2 = await createRes2.json();
    console.log('\nOrder2 ID:', order2.id, '- Status:', order2.status);

    // Confirm with card data AND vault attributes
    console.log('\n=== Confirm with vault+SCA in body ===');
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
                        vault: { store_in_vault: 'ON_SUCCESS' },
                        verification: { method: 'SCA_ALWAYS' },
                    },
                },
            },
        }),
    });
    const confirmData2 = await confirmRes2.json();
    console.log('Confirm HTTP status:', confirmRes2.status);
    console.log('Order status:', confirmData2.status);
    console.log('payment_source:', JSON.stringify(confirmData2.payment_source, null, 2));

    if (confirmData2.status === 'APPROVED' || confirmData2.status === 'COMPLETED') {
        const captureRes2 = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order2.id}/capture`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        });
        const captureData2 = await captureRes2.json();
        console.log('\nCapture status:', captureData2.status);
        console.log('payment_source:', JSON.stringify(captureData2.payment_source, null, 2));
        const vault2 = captureData2.payment_source?.card?.attributes?.vault;
        if (vault2?.id) {
            console.log('\nSUCCESS: Vault ID =', vault2.id);
        } else {
            console.log('\nFAIL: No vault ID');
        }
    } else {
        console.log('Confirm failed:', JSON.stringify(confirmData2, null, 2));
    }

    // ========== Test C: No payment_source in order, plain confirm (no vault), capture ==========
    console.log('\n\n========================================');
    console.log('Test C: No vault at all (baseline - should have NO vault ID)');
    console.log('========================================');

    const createRes3 = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': `test5c-${Date.now()}`,
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{ description: 'Test C baseline', amount: { currency_code: 'USD', value: '1.00' } }],
        }),
    });
    const order3 = await createRes3.json();
    console.log('Order3 ID:', order3.id);

    const confirmRes3 = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order3.id}/confirm-payment-source`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
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
    const confirmData3 = await confirmRes3.json();
    console.log('Confirm status:', confirmData3.status);

    if (confirmData3.status === 'APPROVED' || confirmData3.status === 'COMPLETED') {
        const captureRes3 = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order3.id}/capture`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        });
        const captureData3 = await captureRes3.json();
        console.log('Capture status:', captureData3.status);
        const vault3 = captureData3.payment_source?.card?.attributes?.vault;
        console.log('Vault:', vault3 ? JSON.stringify(vault3) : 'NONE (expected)');
    }
}

test().catch(e => console.error('Failed:', e));
