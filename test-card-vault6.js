// Test 6: Focused tests to understand vault behavior
// Test A: vault in order creation, NO SCA_ALWAYS → confirm → capture (same as test3 but re-verify)
// Test B: NO vault in order, vault in confirm-payment-source → capture
// Test C: vault+SCA in order, vault+card in confirm → check if APPROVED or PAYER_ACTION_REQUIRED

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

async function createOrder(accessToken, body, tag) {
    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': `${tag}-${Date.now()}`,
        },
        body: JSON.stringify(body),
    });
    return res.json();
}

async function confirmPaymentSource(accessToken, orderId, paymentSource) {
    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/confirm-payment-source`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_source: paymentSource }),
    });
    return { status: res.status, data: await res.json() };
}

async function captureOrder(accessToken, orderId) {
    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
    return { status: res.status, data: await res.json() };
}

const testCard = {
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
};

async function test() {
    const accessToken = await getAccessToken();

    // ========== Test A: vault in order (NO SCA), plain confirm ==========
    console.log('='.repeat(60));
    console.log('Test A: vault in ORDER (no SCA), plain card in confirm');
    console.log('='.repeat(60));

    const orderA = await createOrder(accessToken, {
        intent: 'CAPTURE',
        purchase_units: [{ description: 'Test A', amount: { currency_code: 'USD', value: '1.00' } }],
        payment_source: {
            card: {
                attributes: {
                    vault: { store_in_vault: 'ON_SUCCESS' },
                    // NO verification/SCA
                },
            },
        },
    }, 'test6a');
    console.log('Order:', orderA.id, 'Status:', orderA.status);

    const confirmA = await confirmPaymentSource(accessToken, orderA.id, { card: testCard });
    console.log('Confirm:', confirmA.data.status);
    console.log('  payment_source.card.attributes:', JSON.stringify(confirmA.data.payment_source?.card?.attributes, null, 2));

    if (confirmA.data.status === 'APPROVED' || confirmA.data.status === 'COMPLETED') {
        if (confirmA.data.status !== 'COMPLETED') {
            const captureA = await captureOrder(accessToken, orderA.id);
            console.log('Capture:', captureA.data.status);
            console.log('  card.attributes.vault:', JSON.stringify(captureA.data.payment_source?.card?.attributes?.vault, null, 2));
            const v = captureA.data.payment_source?.card?.attributes?.vault;
            console.log(v?.id ? `  >>> SUCCESS: Vault ID = ${v.id}` : '  >>> FAIL: No vault ID');
        } else {
            const v = confirmA.data.payment_source?.card?.attributes?.vault;
            console.log(v?.id ? `  >>> SUCCESS: Vault ID = ${v.id}` : '  >>> FAIL: No vault ID');
        }
    } else {
        console.log('  >>> Status:', confirmA.data.status, '- cannot proceed');
        if (confirmA.data.links) {
            const payerAction = confirmA.data.links.find(l => l.rel === 'payer-action');
            if (payerAction) console.log('  >>> 3DS required:', payerAction.href);
        }
    }

    // ========== Test B: NO vault in order, vault+card in confirm ==========
    console.log('\n' + '='.repeat(60));
    console.log('Test B: NO vault in order, vault+card in confirm');
    console.log('='.repeat(60));

    const orderB = await createOrder(accessToken, {
        intent: 'CAPTURE',
        purchase_units: [{ description: 'Test B', amount: { currency_code: 'USD', value: '1.00' } }],
        // NO payment_source
    }, 'test6b');
    console.log('Order:', orderB.id, 'Status:', orderB.status);

    const confirmB = await confirmPaymentSource(accessToken, orderB.id, {
        card: {
            ...testCard,
            attributes: {
                vault: { store_in_vault: 'ON_SUCCESS' },
            },
        },
    });
    console.log('Confirm:', confirmB.data.status);
    console.log('  payment_source.card.attributes:', JSON.stringify(confirmB.data.payment_source?.card?.attributes, null, 2));

    if (confirmB.data.status === 'APPROVED' || confirmB.data.status === 'COMPLETED') {
        if (confirmB.data.status !== 'COMPLETED') {
            const captureB = await captureOrder(accessToken, orderB.id);
            console.log('Capture:', captureB.data.status);
            console.log('  card.attributes.vault:', JSON.stringify(captureB.data.payment_source?.card?.attributes?.vault, null, 2));
            const v = captureB.data.payment_source?.card?.attributes?.vault;
            console.log(v?.id ? `  >>> SUCCESS: Vault ID = ${v.id}` : '  >>> FAIL: No vault ID');
        }
    } else {
        console.log('  >>> Status:', confirmB.data.status);
        if (confirmB.data.links) {
            const payerAction = confirmB.data.links.find(l => l.rel === 'payer-action');
            if (payerAction) console.log('  >>> 3DS required:', payerAction.href);
        }
    }

    // ========== Test C: vault+SCA in order, vault+SCA+card in confirm ==========
    console.log('\n' + '='.repeat(60));
    console.log('Test C: vault+SCA in order, vault+SCA+card in confirm');
    console.log('='.repeat(60));

    const orderC = await createOrder(accessToken, {
        intent: 'CAPTURE',
        purchase_units: [{ description: 'Test C', amount: { currency_code: 'USD', value: '1.00' } }],
        payment_source: {
            card: {
                attributes: {
                    vault: { store_in_vault: 'ON_SUCCESS' },
                    verification: { method: 'SCA_ALWAYS' },
                },
            },
        },
    }, 'test6c');
    console.log('Order:', orderC.id, 'Status:', orderC.status);

    const confirmC = await confirmPaymentSource(accessToken, orderC.id, {
        card: {
            ...testCard,
            attributes: {
                vault: { store_in_vault: 'ON_SUCCESS' },
                verification: { method: 'SCA_ALWAYS' },
            },
        },
    });
    console.log('Confirm:', confirmC.data.status);
    console.log('  Full response:', JSON.stringify(confirmC.data, null, 2));
}

test().catch(e => console.error('Failed:', e));
