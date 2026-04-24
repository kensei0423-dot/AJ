// Test 3: Simulate full ACDC flow
// 1. Create order with payment_source.card.attributes.vault (no card data)
// 2. Confirm payment source with card data (simulating SDK submit)
// 3. Capture
// 4. Check for vault info

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

    // Step 1: Create order with vault attributes (no card data)
    console.log('=== Step 1: Create order with vault attributes ===');
    const createRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': `test3-${Date.now()}`,
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{ description: 'Test ACDC Vault', amount: { currency_code: 'USD', value: '1.00' } }],
            payment_source: {
                card: {
                    attributes: {
                        vault: { store_in_vault: 'ON_SUCCESS' },
                    },
                },
            },
        }),
    });
    const order = await createRes.json();
    console.log('Order ID:', order.id, '- Status:', order.status);

    // Step 2: Confirm payment source (simulating what SDK submit() does internally)
    console.log('\n=== Step 2: Confirm payment source with card data ===');
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
    console.log('Confirm status:', confirmRes.status);
    console.log('Order status after confirm:', confirmData.status);
    console.log('payment_source after confirm:', JSON.stringify(confirmData.payment_source, null, 2));

    // Check if vault is still in payment_source after confirm
    const vaultAfterConfirm = confirmData.payment_source?.card?.attributes?.vault;
    console.log('\nVault after confirm:', JSON.stringify(vaultAfterConfirm, null, 2));

    if (confirmData.status === 'COMPLETED') {
        console.log('\nOrder auto-completed after confirm');
        if (vaultAfterConfirm?.id) {
            console.log('SUCCESS: Vault ID =', vaultAfterConfirm.id);
        } else {
            console.log('FAIL: No vault ID after confirm-payment-source');
        }
        return;
    }

    // Step 3: Capture
    console.log('\n=== Step 3: Capture order ===');
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order.id}/capture`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });
    const captureData = await captureRes.json();
    console.log('Capture status:', captureRes.status);
    console.log('Order status after capture:', captureData.status);
    console.log('payment_source:', JSON.stringify(captureData.payment_source, null, 2));

    const vaultAfterCapture = captureData.payment_source?.card?.attributes?.vault;
    console.log('\n=== Final Vault Info ===');
    if (vaultAfterCapture?.id) {
        console.log('SUCCESS: Vault ID =', vaultAfterCapture.id);
        console.log('Customer:', JSON.stringify(vaultAfterCapture.customer));
    } else {
        console.log('FAIL: No vault ID in capture response');
    }
}

test().catch(e => console.error('Test failed:', e));
