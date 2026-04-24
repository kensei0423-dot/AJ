# ReelShort Store — Backend Prompt (server.js)

## Overview

Node.js Express server that serves the ReelShort payment storefront and handles PayPal Orders API v2 integration. Includes an in-memory user authentication system with session management. Works with **PayPal JS SDK v6** on the frontend (sandbox: `https://www.sandbox.paypal.com/web-sdk/v6/core`) — the server creates orders and captures payments via API calls initiated by the frontend SDK callbacks. Successful payments are credited to the authenticated user's account.

---

## Tech Stack

- **Runtime**: Node.js (18+ for native `fetch`)
- **Framework**: Express.js
- **Session**: `express-session` with in-memory MemoryStore
- **Password hashing**: `crypto.createHash('sha256')`
- **PayPal API**: Orders v2 (`/v2/checkout/orders`), Identity (`/v1/identity/generate-token`)
- **Auth**: OAuth 2.0 client credentials (PayPal), session cookies (users)
- **Port**: 3777

---

## PayPal Configuration

```
Client ID:  AVkXtxVTYa-8-B3rc3R-V1oDdkKLczfkjQhysVVxdG4aj--k1WOvpfFN5hyP87KE1ve_Tt3tgV7ZgD0y
Secret:     EKH_rpKcyiuaoki9p9EDkmqCWtNylpy2B8toZgN-RH3sVULZhaRRA8llOXvJN-bFtVmwsZlQx26y4RDj
Mode:       sandbox
Base URL:   https://api-m.sandbox.paypal.com
```

---

## Product Catalog

In-memory object `PRODUCTS` keyed by product ID. Each product has `type` (`'vip'` or `'coins'`) and credit fields:

| Product ID | Name | Price | Type | Coins | Bonus | Duration |
|---|---|---|---|---|---|---|
| `weekly_vip` | Weekly VIP | 19.99 | vip | — | — | 7 days |
| `yearly_vip` | Yearly VIP | 199.99 | vip | — | — | 365 days |
| `coins_500` | 500 Coins | 4.99 | coins | 500 | 0 | — |
| `coins_1100` | 1,100 Coins | 9.99 | coins | 1,000 | 100 | — |
| `coins_2400` | 2,400 Coins | 19.99 | coins | 2,000 | 400 | — |
| `coins_3900` | 3,900 Coins | 29.99 | coins | 3,000 | 900 | — |
| `coins_7500` | 7,500 Coins | 49.99 | coins | 5,000 | 2,500 | — |
| `coins_20000` | 20,000 Coins | 99.99 | coins | 10,000 | 10,000 | — |

---

## Middleware

```js
app.use(express.json());
app.use(session({ secret, resave: false, saveUninitialized: false, cookie: { maxAge: 86400000 } }));
app.use(express.static(path.join(__dirname)));
```

- Parse JSON request bodies
- Session management (24h cookie, in-memory store)
- Serve all files in the project directory as static assets

---

## Helper Functions

### `getAccessToken()`

Obtains a PayPal OAuth 2.0 access token using client credentials grant.

### `hashPassword(password)`

Returns SHA-256 hex digest of the password string.

### `getUserSummary(user)`

Returns a safe-to-send subset of user data: `{ username, coins, bonus, vipStatus, createdAt }`.

### `requireAuth(req, res, next)`

Auth middleware. Returns `401` JSON for API calls, redirects to `/login` for page requests.

---

## API Endpoints

### Auth Endpoints

See [user.md](user.md) for full auth endpoint documentation.

- `POST /auth/register` — create account, auto-login
- `POST /auth/login` — authenticate, create session
- `POST /auth/logout` — destroy session
- `GET /auth/me` — get current user info

### `GET /api/user/orders`

Returns the authenticated user's order history (most recent first). Requires auth.

### `GET /api/client-token`

Generates a PayPal client token via the Identity API. Currently unused by the frontend.

### `POST /api/orders`

Creates a PayPal order for the selected product. Requires auth. Stores `pendingProductId` in session.

**Request body**: `{ "productId": "coins_2400" }`

**Response**: `{ "id": "ORDER_ID" }`

### `POST /api/orders/:orderID/capture`

Captures an approved PayPal order. Requires auth. On `COMPLETED` status:
- Credits user's coin balance or activates VIP subscription
- Records order in user's order history
- Clears `pendingProductId` from session

**Response**: Full PayPal capture response JSON.

---

## Page Routes

| Route | Auth | Action |
|---|---|---|
| `GET /` | Required | Serve `index.html` (redirect to `/login` if not auth) |
| `GET /login` | No | Serve `login.html` (redirect to `/` if already auth) |
| `GET /profile` | Required | Serve `profile.html` (redirect to `/login` if not auth) |

---

## Server Startup

```js
const PORT = 3666;
app.listen(PORT, () => {
    console.log(`ReelShort Payment Server running at http://localhost:${PORT}`);
    console.log(`PayPal Mode: ${PAYPAL_MODE}`);
});
```

---

## Request Flow

```
Browser → GET / → no session → 302 /login → login.html
    ↓
POST /auth/register or /auth/login → session created → redirect to /
    ↓
GET / → session valid → index.html
    ↓
JS: checkAuth() → GET /auth/me → populate header + coins bar → initPayPal()
    ↓
User selects product → Clicks PayPal button
    ↓
POST /api/orders { productId } → session stores pendingProductId → return { id }
    ↓
SDK: createPayPalOneTimePaymentSession → session.start() → PayPal popup
    ↓
User approves → onApprove → POST /api/orders/{orderID}/capture
    ↓
Server: capture OK → credit user (coins/bonus or VIP) → record order → return result
    ↓
JS: showSuccessModal() + refreshBalance() → updated coins bar
```

---

## Dependencies

```json
{
  "express": "^4.21.0",
  "express-session": "^1.18.0"
}
```

Uses native `fetch` (Node 18+), `crypto`, and `Buffer`.

---

## Notes

- All data is in-memory — lost on server restart (demo/prototype)
- Access tokens are fetched per-request (no caching) — suitable for sandbox/demo
- No database — users and products are in-memory
- SHA-256 password hashing is not production-grade (use bcrypt/argon2 in production)
- No CSRF protection — acceptable for demo
- CORS is not explicitly configured (same-origin serving via express.static)
- The `orderID` URL parameter is passed directly to the PayPal API URL path; in production, validate format
- SDK URL must match PayPal mode: `www.sandbox.paypal.com` for sandbox, `www.paypal.com` for production
- The `/api/client-token` endpoint exists but is unused — the v6 SDK initializes with `clientId` only
