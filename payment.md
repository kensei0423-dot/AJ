# ReelShort Payment Flow

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (index.html)                    │
│                                                                 │
│  ┌──────────────────────┐    ┌────────────────────────────────┐ │
│  │  Custom PayPal Button │    │  Standard PayPal Button        │ │
│  │  (PayPal JS SDK v6)   │    │  (PayPal Classic SDK sdk/js)   │ │
│  │  - Headless API       │    │  - paypalClassic.Buttons()     │ │
│  │  - Custom HTML button │    │  - SDK-rendered UI             │ │
│  │  - Black bg / white   │    │  - Gold style                  │ │
│  └──────────┬───────────┘    └──────────────┬─────────────────┘ │
│             │                               │                   │
└─────────────┼───────────────────────────────┼───────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (server.js :3777)                  │
│                                                                 │
│  POST /api/orders              - Create order                   │
│  POST /api/orders/:id/capture  - Capture order                  │
│  POST /api/orders/saved        - Pay with vault_id (no popup)   │
│  GET  /api/client-token        - Generate id_token for returning│
│  POST /api/vault/setup-token   - Create vault setup token       │
│  POST /api/vault/payment-token - Create payment token           │
│  GET  /api/vault/payment-methods   - List saved methods         │
│  DELETE /api/vault/payment-methods/:id - Delete saved method    │
│  POST /api/subscription/change       - Change VIP plan          │
│  POST /api/subscription/cancel       - Cancel VIP               │
│  POST /api/subscription/renew-discount - Renew with discount    │
│  GET  /api/admin/users               - All users data           │
│  GET  /api/admin/order-stats         - Order stats (dedup)      │
│  GET  /api/admin/disputes            - List disputes            │
│  GET  /api/admin/disputes/:id        - Dispute detail           │
│  GET  /api/admin/disputes/search/order/:id - Search by order    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PayPal API (sandbox)                           │
│                                                                 │
│  POST /v1/oauth2/token               - Access token / id_token  │
│  POST /v1/identity/generate-token    - Client token             │
│  POST /v2/checkout/orders            - Create order              │
│  POST /v2/checkout/orders/:id/capture - Capture order            │
│  GET  /v2/checkout/orders/:id        - Get order (admin search)  │
│  GET  /v1/customer/disputes          - List/search disputes      │
│  GET  /v1/customer/disputes/:id      - Dispute detail            │
│  POST /v3/vault/setup-tokens         - Vault setup token         │
│  POST /v3/vault/payment-tokens       - Create payment token      │
│  DELETE /v3/vault/payment-tokens/:id - Delete payment token      │
└─────────────────────────────────────────────────────────────────┘
```

## Two SDKs

| | Custom PayPal Button | Standard PayPal Button |
|---|---|---|
| SDK | PayPal JS SDK v6 (`web-sdk/v6/core`) | PayPal Classic SDK (`sdk/js`) |
| Global | `paypal` | `paypalClassic` (via `data-namespace`) |
| Button | Custom HTML `<button>` (black bg, white text) | `paypalClassic.Buttons().render()` (gold) |
| Popup trigger | `session.start()` | SDK manages internally |
| Returning payer | vault_id, no popup | `data-user-id-token`, popup with pre-filled info |
| Card funding | N/A (custom button) | Disabled (`disable-funding=card`) |

### ACDC (Advanced Credit and Debit Card) — SDK v6

| | Card Fields (ACDC) |
|---|---|
| SDK | PayPal JS SDK v6 (`web-sdk/v6/core`) component `card-fields` |
| Global | `paypal` (same instance, adds `card-fields` component) |
| Input | Hosted card fields (`<paypal-hosted-card-field>` Web Components with iframe) |
| Popup | **No** — card details entered directly on page |
| Create order | `POST /api/orders/card` (no `payment_source`) |
| Submit | `session.submit(orderId)` — returns `{ data: { orderId }, state }` |
| Capture | Client calls `/api/orders/:id/capture` after submit resolves |

## Page Init Sequence

```
checkAuth()
  ├── initPayPal()                    // Init SDK v6 instance (components: paypal-payments, card-fields)
  │     └── initCardFields()          // Create card fields session + append Web Components
  ├── await loadSavedMethods()        // GET /api/vault/payment-methods
  │     └── updatePayPalButton()      // Show email on custom button if returning payer
  │                                   // Hide "save payment method" checkbox if returning payer
  └── initPayPalClassic()
        ├── (if returning payer) GET /api/client-token?customer_id=xxx
        │     └── Server: POST /v1/oauth2/token (response_type=id_token)
        │           → returns JWT id_token
        ├── loadPayPalClassicSDK(idToken)
        │     └── <script src="sdk/js?client-id=xxx&currency=USD&disable-funding=card"
        │              data-namespace="paypalClassic"
        │              data-user-id-token="eyJ...">
        └── renderPayPalButtons()
```

---

## Flow 1: New Payer - Custom Button (SDK v6)

First-time purchase with vault-with-purchase enabled.

```
User selects product → clicks Custom PayPal button
  │
  ▼
[Client] handlePayPal()
  │  savedMethods.length === 0 → new payer flow
  │
  ├─► [Client → Server] POST /api/orders
  │     Body: { productId, savePaymentMethod: true }
  │     │
  │     └─► [Server → PayPal] POST /v2/checkout/orders
  │           Body: {
  │             intent: "CAPTURE",
  │             purchase_units: [{ amount: { value: "4.99" } }],
  │             payment_source: {
  │               paypal: {
  │                 experience_context: {
  │                   payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
  │                   shipping_preference: "NO_SHIPPING"
  │                 },
  │                 attributes: {
  │                   vault: {
  │                     store_in_vault: "ON_SUCCESS",
  │                     usage_type: "MERCHANT",
  │                     customer_type: "CONSUMER"
  │                   }
  │                 }
  │               }
  │             }
  │           }
  │           ← { id: "ORDER_ID" }
  │
  ├─► [Client] sdkInstance.createPayPalOneTimePaymentSession({ orderId })
  │     └── session.start()  → Opens PayPal popup
  │
  ▼  User approves in popup
  │
  ├─► [Client → Server] POST /api/orders/ORDER_ID/capture
  │     │
  │     └─► [Server → PayPal] POST /v2/checkout/orders/ORDER_ID/capture
  │           ← {
  │               status: "COMPLETED",
  │               payment_source: {
  │                 paypal: {
  │                   email_address: "user@example.com",
  │                   attributes: {
  │                     vault: {
  │                       id: "PAYMENT_TOKEN_ID",      ← payment token
  │                       customer: { id: "CUSTOMER_ID" }  ← customer id
  │                     }
  │                   }
  │                 }
  │               }
  │             }
  │
  ├─► [Server] creditUser() → add coins/bonus or activate VIP
  ├─► [Server] Save payment method → user.savedPaymentMethods.push({
  │     paymentTokenId, customerId, email, savedAt
  │   })
  │
  └─► [Client] showSuccessModal() + refreshBalance() + loadSavedMethods()
```

## Flow 2: Returning Payer - Custom Button (vault_id, no popup)

User has saved payment method. Payment completes server-side without popup.

```
User selects product → clicks Custom PayPal button
  │
  ▼
[Client] handlePayPal()
  │  savedMethods.length > 0 → returning payer flow
  │
  ├─► [Client → Server] POST /api/orders/saved
  │     Body: {
  │       productId: "coins_500",
  │       paymentTokenId: "2d49995737537073d"
  │     }
  │     │
  │     └─► [Server] Verify token belongs to user
  │     └─► [Server → PayPal] POST /v2/checkout/orders
  │           Headers: { PayPal-Request-Id: "saved-test1-coins_500-912345" }
  │           Body: {
  │             intent: "CAPTURE",
  │             purchase_units: [{ amount: { value: "4.99" } }],
  │             payment_source: {
  │               paypal: {
  │                 vault_id: "2d49995737537073d"  ← auto-approve + auto-capture
  │               }
  │             }
  │           }
  │           ← { status: "COMPLETED", ... }
  │
  ├─► [Server] creditUser() → add coins/bonus or activate VIP
  │
  └─► [Client] showSuccessModal() + refreshBalance()
```

## Flow 3: New Payer - Standard Button (Classic SDK)

Same server-side flow as Flow 1, but using SDK-rendered button. Credit/debit card funding disabled.

```
User selects product → clicks Standard PayPal button (SDK-rendered, gold)
  │
  ▼
[SDK] paypalClassic.Buttons → createOrder callback
  │
  ├─► [Client → Server] POST /api/orders
  │     Body: { productId, savePaymentMethod }
  │     └─► [Server → PayPal] POST /v2/checkout/orders
  │           Body: {
  │             intent: "CAPTURE",
  │             purchase_units: [{ amount }],
  │             payment_source: {
  │               paypal: {
  │                 experience_context: {
  │                   payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
  │                   shipping_preference: "NO_SHIPPING"
  │                 },
  │                 attributes: { vault: { ... } }  ← if savePaymentMethod
  │               }
  │             }
  │           }
  │           ← { id: "ORDER_ID" }
  │     ← return ORDER_ID to SDK
  │
  ▼  SDK opens popup → user approves
  │
  ├─► [SDK] onApprove callback → { orderID }
  │
  ├─► [Client → Server] POST /api/orders/ORDER_ID/capture
  │     └─► [Server → PayPal] POST /v2/checkout/orders/ORDER_ID/capture
  │           ← { status: "COMPLETED", ... }
  │
  ├─► [Server] creditUser() + save vault info (if vault-with-purchase)
  │
  └─► [Client] showSuccessModal() + refreshBalance() + loadSavedMethods()
```

## Flow 4: Returning Payer - Standard Button (Classic SDK + id_token)

SDK loaded with `data-user-id-token` for returning payer experience. PayPal pre-fills saved payment info in the popup.

```
[Page load] initPayPalClassic()
  │
  ├─► [Client → Server] GET /api/client-token?customer_id=zUBSWMdMJv
  │     │
  │     └─► [Server → PayPal] POST /v1/oauth2/token
  │           Body: grant_type=client_credentials
  │                 &response_type=id_token
  │                 &target_customer_id=zUBSWMdMJv
  │           ← { id_token: "eyJraWQ..." }   ← JWT
  │
  ├─► [Client] loadPayPalClassicSDK(idToken)
  │     └── <script src="sdk/js?client-id=xxx&currency=USD&disable-funding=card"
  │              data-namespace="paypalClassic"
  │              data-user-id-token="eyJraWQ...">
  │
  └─► [Client] renderPayPalButtons()

User clicks Standard button → same as Flow 3
  but PayPal popup shows pre-filled payment info (returning payer UX)
```

## Flow 5: ACDC — Card Payment (SDK v6 Card Fields)

Direct credit/debit card payment on page. No PayPal popup. Uses hosted card fields (Web Components with iframes).

```
User selects product → enters card details → clicks "Pay with Card"
  │
  ▼
[Client] submitCardPayment()
  │
  ├─► [Client → Server] POST /api/orders/card
  │     Body: { productId }
  │     │
  │     └─► [Server → PayPal] POST /v2/checkout/orders
  │           Headers: { PayPal-Request-Id: "card-{user}-{productId}-{timestamp}" }
  │           Body: {
  │             intent: "CAPTURE",
  │             purchase_units: [{ amount: { value: "4.99" } }]
  │           }
  │           ← { id: "ORDER_ID" }
  │           Note: No payment_source — CardFields SDK handles it client-side
  │
  ├─► [Client] cardFieldsSession.submit(orderId)
  │     → SDK collects card data from hosted fields
  │     → SDK sends card data + orderId to PayPal
  │     ← { data: { orderId: "ORDER_ID" }, state: "succeeded" }
  │
  ├─► [Client → Server] POST /api/orders/ORDER_ID/capture
  │     │
  │     └─► [Server → PayPal] POST /v2/checkout/orders/ORDER_ID/capture
  │           ← { status: "COMPLETED", ... }
  │
  ├─► [Server] creditUser() → add coins/bonus or activate VIP
  │
  └─► [Client] showSuccessModal() + refreshBalance() + loadSavedMethods()
```

### V6 SDK Card Fields API

```js
// Init: add 'card-fields' to components
sdkInstance = await paypal.createInstance({
    clientId: '...',
    components: ['paypal-payments', 'card-fields'],
});

// Create session (no callbacks needed — submit() returns result directly)
cardFieldsSession = sdkInstance.createCardFieldsOneTimePaymentSession({});

// Render: Web Components — must use appendChild (NOT .render())
document.getElementById('card-number-field').appendChild(
    cardFieldsSession.createCardFieldsComponent({ type: 'number' })
);
// Same for 'expiry' and 'cvv'

// Submit: pass orderId as first argument
const result = await cardFieldsSession.submit(orderId);
// result = { data: { orderId }, state: "succeeded" }
// Then capture on server
```

### Key V6 SDK Notes

- `createCardFieldsComponent({ type })` returns `<paypal-hosted-card-field>` — a Lit Web Component
- Must use `container.appendChild(component)` — `.render('#selector')` resolves but leaves empty DOM
- `submit(orderId)` takes order ID as first arg, returns result directly (no `onApprove` callback)
- `createOrder` callback is NOT supported in V6 card-fields
- Only ONE card fields session per SDK instance (calling again throws error)
- `session.update({ amount })` is for updating display amount only, NOT for setting orderId

---

## Vault with Purchase

Saves user's PayPal account during a normal payment.

```
Trigger:  "Save payment method" checkbox checked (default: checked)
          Hidden when user already has saved method

Server:   POST /api/orders with savePaymentMethod: true
          → adds payment_source.paypal.attributes.vault to order

Capture:  Response includes payment_source.paypal.attributes.vault
          → { id: "PAYMENT_TOKEN_ID", customer: { id: "CUSTOMER_ID" } }

Storage:  user.savedPaymentMethods = [{
            paymentTokenId: "2d49995737537073d",
            customerId: "zUBSWMdMJv",
            email: "kising-ae@126.com",
            savedAt: "2026-02-25T02:11:00.675Z"
          }]
```

## Saved Payment Method Data Model

```json
{
  "paymentTokenId": "2d49995737537073d",
  "customerId": "zUBSWMdMJv",
  "email": "kising-ae@126.com",
  "savedAt": "2026-02-25T02:11:00.675Z"
}
```

| Field | Source | Usage |
|---|---|---|
| `paymentTokenId` | `vault.id` from capture response | Used as `vault_id` in Flow 2 |
| `customerId` | `vault.customer.id` from capture response | Used to generate `id_token` in Flow 4 |
| `email` | `payment_source.paypal.email_address` | Displayed on custom button |

## Delete Saved Payment Method

Deletion shows a styled confirmation modal (matching cancel subscription style) warning the user that auto-renewal will not work after removal.

```
User clicks "Delete" on saved method
  │
  ├─► [Client] Show delete confirmation modal
  │     "After removal, your subscription will not be able to auto-renew.
  │      You will need to manually complete payment each time."
  │
  ├── [Keep Payment Method] → close modal
  │
  └── [Remove Anyway]
        ├─► [Client → Server] DELETE /api/vault/payment-methods/:tokenId
        │     │
        │     └─► [Server → PayPal] DELETE /v3/vault/payment-tokens/:tokenId
        │     └─► [Server] Remove from user.savedPaymentMethods[]
        │           ← { success: true }
        │
        └─► [Client] Reload page
```

---

## Subscription Management (profile.html)

### Change Plan

Switch between weekly and yearly VIP.

```
User clicks "Switch to [other plan]"
  │
  ├─► confirm() dialog
  │
  └─► [Client → Server] POST /api/subscription/change
        Body: { newPlan: "yearly_vip" | "weekly_vip" }
        ← { success: true, vipStatus }
        → Reload page
```

### Cancel Subscription (with Retention Offer)

Cancellation shows a retention modal offering 2% discount to keep the user.

```
User clicks "Cancel Subscription"
  │
  ├─► [Client] Show retention modal
  │     - Original price (strikethrough)
  │     - Discounted price (2% off)
  │     - "Accept Offer & Stay VIP" button
  │     - "No thanks, cancel anyway" button
  │
  ├── [Accept Offer & Stay VIP]
  │     └─► [Client → Server] POST /api/subscription/renew-discount
  │           Body: { plan: "weekly_vip" | "yearly_vip" }
  │           ← Server applies 2% discount, extends subscription
  │           → Reload page
  │
  └── [No thanks, cancel anyway]
        └─► [Client → Server] POST /api/subscription/cancel
              ← { success: true }
              → user.vipStatus = null
              → Reload page
```

### Weekly VIP Renewal (5% Discount)

Weekly VIP users see a renewal button with 5% discount.

```
Weekly VIP user views profile
  │
  ├─► [Client] Show "Renew $18.99/week -5%" button
  │
  └─► User clicks renew
        └─► [Client → Server] POST /api/subscription/renew-discount
              Body: { plan: "weekly_vip", discountRate: 0.05 }
              ← Server applies 5% discount, extends 7 days
              → Reload page
```

### Discount Rate Validation

Server only accepts whitelisted discount rates:

| Rate | Source | Usage |
|---|---|---|
| 2% (`0.02`) | Cancel retention offer | Default if rate not specified |
| 5% (`0.05`) | Weekly renewal button | Must be explicitly passed |

---

## Product Catalog

### VIP Subscriptions

| Product ID | Name | Price | Duration |
|---|---|---|---|
| `weekly_vip` | Weekly VIP | $19.99 | 7 days |
| `yearly_vip` | Yearly VIP | $199.99 | 365 days |

### Coin Packages

| Product ID | Name | Price | Coins | Bonus |
|---|---|---|---|---|
| `coins_500` | 500 Coins | $4.99 | 500 | 0 |
| `coins_1100` | 1,100 Coins | $9.99 | 1,000 | 100 (+10%) |
| `coins_2400` | 2,400 Coins | $19.99 | 2,000 | 400 (+20%) |
| `coins_3900` | 3,900 Coins | $29.99 | 3,000 | 900 (+30%) |
| `coins_7500` | 7,500 Coins | $49.99 | 5,000 | 2,500 (+50%) |
| `coins_20000` | 20,000 Coins | $99.99 | 10,000 | 10,000 (+100%) |

---

## API Endpoints

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login |
| POST | `/auth/logout` | Yes | Logout |
| GET | `/auth/me` | Yes | Get current user info |

### Payment

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/client-token` | No | Generate client token or id_token (`?customer_id=xxx`) |
| POST | `/api/orders` | Yes | Create PayPal order (with optional vault, always `NO_SHIPPING`) |
| POST | `/api/orders/card` | Yes | Create ACDC card order (no payment_source) |
| POST | `/api/orders/:id/capture` | Yes | Capture approved order |
| POST | `/api/orders/saved` | Yes | Pay with vault_id (no popup) |

### Vault

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/vault/setup-token` | Yes | Create vault setup token |
| POST | `/api/vault/payment-token` | Yes | Create payment token from setup token |
| GET | `/api/vault/payment-methods` | Yes | List user's saved payment methods |
| DELETE | `/api/vault/payment-methods/:id` | Yes | Delete saved payment method (PayPal + local) |

### Subscription

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/subscription/change` | Yes | Switch between weekly/yearly VIP |
| POST | `/api/subscription/cancel` | Yes | Cancel VIP subscription |
| POST | `/api/subscription/renew-discount` | Yes | Renew with discount (2% or 5%) |

### User Data

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/user/orders` | Yes | Get order history |

### Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin` | No | Serve admin dashboard page |
| GET | `/api/admin/users` | No | Get all users data (username, coins, bonus, VIP, orders, saved methods) |
| GET | `/api/admin/order-stats` | No | Get order stats with dedup (`{ initiated, success, failed, rate }`) |
| GET | `/api/admin/disputes` | No | List disputes from PayPal (supports `start_time`, `end_time`, `dispute_state`, `disputed_transaction_id`, `page_size`) |
| GET | `/api/admin/disputes/:disputeId` | No | Get single dispute detail from PayPal |
| GET | `/api/admin/disputes/search/order/:orderId` | No | Search disputes by Order ID (Order → Capture IDs → Disputes) |

---

## Flow Comparison

| | Custom Button (New) | Custom Button (Returning) | Standard Button (New) | Standard Button (Returning) | ACDC Card Fields |
|---|---|---|---|---|---|
| SDK | v6 headless | v6 headless | Classic `sdk/js` | Classic `sdk/js` + `data-user-id-token` | v6 `card-fields` |
| Button style | Black bg, white text | Black bg, white text + email | Gold (SDK-rendered) | Gold (SDK-rendered) | Custom "Pay with Card" |
| Card funding | N/A | N/A | Disabled | Disabled | **Direct card input** |
| Popup | Yes | **No** | Yes | Yes (pre-filled) | **No** |
| Create order | `POST /api/orders` | `POST /api/orders/saved` | `POST /api/orders` | `POST /api/orders` | `POST /api/orders/card` |
| Payment source | `paypal + vault attrs` | `paypal.vault_id` | `paypal + vault attrs` | `paypal + vault attrs` | None (SDK handles) |
| Capture | Client calls `/capture` | Server auto-captures | Client calls `/capture` | Client calls `/capture` | Client calls `/capture` |
| Vault save | On capture response | N/A (already saved) | On capture response | On capture response | N/A |
| id_token needed | No | No | No | Yes (`/v1/oauth2/token`) | No |
| Shipping | `NO_SHIPPING` | N/A (server-side) | `NO_SHIPPING` | `NO_SHIPPING` | N/A |

---

## Admin — Order Stats

Admin Dashboard Stats Bar 中展示订单统计（持久化到 `order-stats.json`，重启不归零）。通过 `PayPal-Request-Id` 实现幂等性和 `initiated` 去重。

### PayPal-Request-Id

所有支付交易请求携带 `PayPal-Request-Id` 头，30 分钟有效期内保持不变：

```js
function generateRequestId(username, productId, action) {
    const timeSlot = Math.floor(Date.now() / (30 * 60 * 1000)); // 30分钟时间窗
    return `${action}-${username}-${productId}-${timeSlot}`;
}
```

| 端点 | Request ID 格式 |
|------|----------------|
| `POST /api/orders` | `create-{user}-{productId}-{timeSlot}` |
| `POST /api/orders/card` | `card-{user}-{productId}-{timestamp}` (unique per request, no dedup) |
| `POST /api/orders/:id/capture` | `capture-{user}-{orderId}-{timeSlot}` |
| `POST /api/orders/saved` | `saved-{user}-{productId}-{timeSlot}` |

### 统计去重

使用 `trackInitiated(requestId)` 替代 `orderStats.initiated++`，通过 `seenRequestIds` Map 去重：

- 30 分钟内同一用户对同一商品的重复请求，`initiated` 只计一次
- 过期条目（>30 分钟）自动清理
- `failed` 和 `success` 不去重（每次结果都计数）

### 追踪范围

| 追踪的订单操作 | 不追踪 |
|---|---|
| `POST /api/orders` — 创建订单 | `POST /v1/oauth2/token` — OAuth |
| `POST /api/orders/:id/capture` — 捕获订单 | `POST /v1/identity/generate-token` — Client token |
| `POST /api/orders/saved` — Vault 支付 | `GET /v1/customer/disputes` — 争议查询 |
| `POST /api/test/create-order` — 测试创建 | `POST /v3/vault/*` — Vault 管理 |
| `POST /api/test/capture-order` — 测试捕获 | |

### 实现

```
server.js:
  let orderStats = JSON.parse(fs.readFileSync('order-stats.json'));  // persisted
  const seenRequestIds = new Map();  // requestId → timestamp (in-memory)

  trackInitiated(requestId)
    → 30分钟内同一 requestId 不重复计数 initiated
    → 过期条目自动清理
  saveOrderStats() → 每次变更后写入 order-stats.json

  GET /api/admin/order-stats → { initiated, success, failed, rate }

admin.html Stats Bar:
  [Total Users] [Revenue] [Active VIP] [Saved Methods]
  [Orders Initiated] [Orders Success ✓] [Orders Failed ✗] [Success Rate]
       白色                绿色              红色              绿色
```

---

## Admin — Dispute Management (admin.html)

Seller Admin Dashboard 用于管理用户和处理 PayPal 争议。详细文档见 `admin.md`。

### Dispute Search — 3 种方式

```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│  Search by Order ID  │ │  Search by Case ID   │ │ Search by Txn ID    │
│  e.g. 15369036YJ...  │ │  e.g. PP-R-CTA-...   │ │ e.g. 1RG78758WE...  │
└──────────┬──────────┘ └──────────┬──────────┘ └──────────┬──────────┘
           │                       │                       │
           ▼                       ▼                       ▼
  Order ID → Capture ID     Direct dispute         Direct dispute
  → Disputes API            detail lookup          list query
                             + Resolution Center
                               link button
```

### Flow: Search by Order ID

```
Admin enters Order ID
  │
  ├─► [Client → Server] GET /api/admin/disputes/search/order/:orderId
  │     │
  │     ├─► [Server → PayPal] GET /v2/checkout/orders/:orderId
  │     │     ← { purchase_units: [{ payments: { captures: [{ id }] } }] }
  │     │     → Extract Capture IDs
  │     │
  │     ├─► [Server → PayPal] For each captureId:
  │     │     GET /v1/customer/disputes?disputed_transaction_id=:captureId
  │     │     ← { items: [...disputes] }
  │     │
  │     └─► Deduplicate by dispute_id
  │           ← { items, total_items, order, captureIds }
  │
  └─► [Client] Display order info + disputes (if any)
```

### Flow: Search by Transaction ID

```
Admin enters Capture/Transaction ID
  │
  ├─► [Client → Server] GET /api/admin/disputes?disputed_transaction_id=:txnId
  │     │
  │     └─► [Server → PayPal] GET /v1/customer/disputes?disputed_transaction_id=:txnId
  │           ← { items: [...disputes] }
  │
  ├─► [Server] Cross-reference with local users (captureId / order ID matching)
  │
  └─► [Client] Display disputes or "No disputes found"
```

### Flow: List All Disputes

```
Admin sets filters (date range, status) → clicks Search
  │
  │  Dropdown uses "status" field values (not dispute_state):
  │    OPEN / WAITING_FOR_SELLER_RESPONSE / WAITING_FOR_BUYER_RESPONSE
  │    UNDER_REVIEW / RESOLVED / OTHER
  │
  │  Client maps status → dispute_state for API query:
  │    OPEN                          → dispute_state=OPEN
  │    WAITING_FOR_SELLER_RESPONSE   → dispute_state=REQUIRED_ACTION
  │    WAITING_FOR_BUYER_RESPONSE    → dispute_state=REQUIRED_OTHER_PARTY_ACTION
  │    UNDER_REVIEW                  → dispute_state=UNDER_REVIEW
  │    RESOLVED                      → dispute_state=RESOLVED (skip date params)
  │    OTHER                         → dispute_state=OTHER
  │
  ├─► [Client → Server] GET /api/admin/disputes?start_time=...&end_time=...&dispute_state=...
  │     │
  │     ├─► [Server → PayPal] GET /v1/customer/disputes?start_time=...&dispute_state=...&page_size=50
  │     │     ← { items: [...disputes] }
  │     │
  │     ├─► [Server] Cross-reference with local users
  │     │     For each dispute's disputed_transactions:
  │     │       seller_transaction_id → match user order captureId
  │     │       buyer_transaction_id  → match user order ID
  │     │     → Enrich with matchedUser / matchedOrder
  │     │
  │     └─► [Server] Filter by end_time locally (PayPal sandbox limitation)
  │           ← { items, total_items, total_pages }
  │
  ├─► [Client] Filter by status field (always, since dispute_state ≠ status)
  │
  ├─► [Client] If RESOLVED: filter by update_time instead of create_time
  │     (PayPal API start_time filters by create_time, but resolved disputes
  │      may have been created long ago and only recently resolved)
  │
  └─► [Client] Render disputes table with matched user badges
```

### Dispute Detail Modal

```
Admin clicks dispute row
  │
  ├─► [Client → Server] GET /api/admin/disputes/:disputeId
  │     │
  │     └─► [Server → PayPal] GET /v1/customer/disputes/:disputeId
  │           ← Full dispute object
  │
  └─► [Client] Render modal with:
        - Header: title + "PayPal Resolution Center" link button
          → https://www.sandbox.paypal.com/resolutioncenter/view/{dispute_id}/inquiry
        - Basic Info (status, amount, reason, lifecycle, channel, flow)
        - Seller Response Due Date / External Reason Code
        - Dispute Outcome / Amount Refunded
        - Allowed Response Options (accept claim, make offer, provide evidence)
        - Available Actions (API links)
        - Disputed Transactions (seller/buyer IDs, amounts, buyer/seller info, items)
        - Extensions (billing dispute / merchandise dispute properties)
        - Offers (current + history)
        - Evidence (tracking, refund IDs, documents)
        - Money Movements (credits/debits with payer/payee)
        - Communication Details
        - Messages (with attachments)
        - API Links
```

### PayPal Resolution Center Link

争议详情 Modal 和 Case ID 搜索结果中均包含一个 "PayPal Resolution Center" 超链接按钮，点击后在新标签页打开 PayPal 争议处理页面：

```
URL: https://www.sandbox.paypal.com/resolutioncenter/view/{dispute_id}/inquiry

出现位置:
  1. Dispute Detail Modal — header 右侧（关闭按钮左边）
  2. Case ID Search Result — header 右侧（关闭按钮左边）
```

### User-Dispute Matching Logic

Server 端将 PayPal 争议与本地用户进行交叉匹配：

```
For each dispute.disputed_transactions:
  1. seller_transaction_id → match against user.orders[].captureId
  2. seller_transaction_id → match against user.orders[].id (order ID)
  3. buyer_transaction_id  → match against user.orders[].id (order ID)
  → If matched: set matchedUser (username) + matchedOrder (order object)
```

---

## Files

| File | Description |
|---|---|
| `server.js` | Express backend, PayPal API integration, auth, vault, subscription, admin/disputes, persistence |
| `index.html` | Store page with both payment buttons, saved methods, vault-with-purchase |
| `profile.html` | User profile, order history, subscription management, retention/renewal, saved methods |
| `login.html` | Login / register page |
| `admin.html` | Seller Admin dashboard — user management, dispute search/detail (dark theme) |
| `users.json` | User data persistence (coins, orders, saved methods, VIP status, discount) |
| `order-stats.json` | Order stats persistence (initiated, success, failed) |
| `test.html` | Error simulation test page (7 scenarios) |
| `test.md` | Test documentation with mock/natural trigger samples |
| `payment.md` | This document |
| `admin.md` | Admin dashboard detailed documentation |
