# ReelShort Store — User System Prompt (login.html / profile.html)

## Overview

In-memory user authentication system for the ReelShort payment storefront. Provides registration, login, profile page with coin balance and order history. The store page requires authentication — unauthenticated visitors are redirected to the login page. Sessions are managed via `express-session` with the default MemoryStore (data lost on server restart).

---

## Tech Stack

- **Session**: `express-session` with in-memory MemoryStore
- **Password hashing**: `crypto.createHash('sha256')` (demo only, not production-grade)
- **Storage**: In-memory JavaScript object (no database)

---

## Data Structures

### User Object

Stored in the in-memory `users` object, keyed by username:

```js
{
    username: 'alice',
    passwordHash: 'sha256hex...',
    coins: 2000,
    bonus: 400,
    vipStatus: null | {
        plan: 'weekly_vip' | 'yearly_vip',
        expiresAt: '2025-06-01T00:00:00.000Z',
    },
    orders: [
        {
            id: 'PAYPAL_ORDER_ID',
            productId: 'coins_2400',
            productName: '2,400 Coins',
            amount: '19.99',
            status: 'COMPLETED',
            createdAt: '2025-05-25T12:00:00.000Z',
            coinsAdded: 2000,
            bonusAdded: 400,
        },
    ],
    createdAt: '2025-05-20T10:00:00.000Z',
}
```

### Product Catalog (Enhanced)

Each product includes `type`, `coins`, `bonus`, or `duration` fields for crediting user accounts:

| Product ID | Type | Coins | Bonus | Duration |
|---|---|---|---|---|
| `weekly_vip` | vip | — | — | 7 days |
| `yearly_vip` | vip | — | — | 365 days |
| `coins_500` | coins | 500 | 0 | — |
| `coins_1100` | coins | 1,000 | 100 | — |
| `coins_2400` | coins | 2,000 | 400 | — |
| `coins_3900` | coins | 3,000 | 900 | — |
| `coins_7500` | coins | 5,000 | 2,500 | — |
| `coins_20000` | coins | 10,000 | 10,000 | — |

---

## Session Configuration

```js
app.use(session({
    secret: 'reelshort-demo-secret-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,      // false for HTTP dev
        httpOnly: true,
        maxAge: 86400000,   // 24 hours
    },
}));
```

Session stores: `req.session.username` (string) and `req.session.pendingProductId` (string, temporary during payment).

---

## Auth Endpoints

### `POST /auth/register`

**Request**: `{ "username": "alice", "password": "mypass123" }`

**Validation**:
- Username: 3-20 characters, letters/numbers/underscore only
- Password: minimum 6 characters
- Username must not already exist

**Response**: `{ "success": true, "user": { username, coins, bonus, vipStatus, createdAt } }`

**Errors**: `400` (validation), `409` (username taken)

Auto-sets session after registration (user is immediately logged in).

---

### `POST /auth/login`

**Request**: `{ "username": "alice", "password": "mypass123" }`

**Response**: `{ "success": true, "user": { username, coins, bonus, vipStatus, createdAt } }`

**Errors**: `400` (missing fields), `401` (invalid credentials)

---

### `POST /auth/logout`

**Response**: `{ "success": true }`

Destroys the session.

---

### `GET /auth/me`

Returns current authenticated user's info.

**Response**: `{ "username": "alice", "coins": 2000, "bonus": 400, "vipStatus": null, "createdAt": "..." }`

**Error**: `401` if not authenticated.

---

### `GET /api/user/orders`

Returns the authenticated user's order history (most recent first).

**Response**: Array of order objects.

**Error**: `401` if not authenticated.

---

## Auth Middleware

```js
function requireAuth(req, res, next) {
    if (!req.session.username) {
        if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        return res.redirect('/login');
    }
    next();
}
```

Applied to: `POST /api/orders`, `POST /api/orders/:orderID/capture`, `GET /api/user/orders`.

---

## Page Routes

| Route | Auth Required | Action |
|---|---|---|
| `GET /` | Yes | Serve `index.html` (redirect to `/login` if not authenticated) |
| `GET /login` | No | Serve `login.html` (redirect to `/` if already authenticated) |
| `GET /profile` | Yes | Serve `profile.html` (redirect to `/login` if not authenticated) |

---

## Payment-to-User Linking

When `POST /api/orders` is called, the `productId` is stored in `req.session.pendingProductId`.

When `POST /api/orders/:orderID/capture` succeeds with status `COMPLETED`:

1. Look up the user via `req.session.username`
2. Look up the product via `req.session.pendingProductId`
3. If product type is `coins`: add `product.coins` to `user.coins` and `product.bonus` to `user.bonus`
4. If product type is `vip`: set `user.vipStatus` with plan name and expiry date
5. Record the order in `user.orders` array (unshift to front)
6. Clear `pendingProductId` from session

---

## Login Page (login.html)

### Layout

- Centered card on `#0d0d0d` background
- Card: `#1c1c1c` bg, `#2d2d2d` border, `16px` radius, max-width `420px`
- ReelShort logo (red "R" square) + "ReelShort" text
- Toggle between Login and Register modes via JS (no page reload)

### Form Fields

- Username input: `#0d0d0d` bg, `#333` border, focus border `#d4a03c`
- Password input: same style
- Confirm Password: shown only in Register mode
- Submit button: gold gradient `linear-gradient(135deg, #d4a03c, #b8862d)`

### JavaScript

- `isLoginMode` state (boolean)
- `toggleMode()` — switches between Login/Register, shows/hides confirm password
- `handleSubmit(e)` — validates input, calls `/auth/login` or `/auth/register`, redirects to `/` on success
- Error/success messages styled with existing red/green palette

---

## Profile Page (profile.html)

### Layout

- Same header as store page: logo, nav link to Store, user avatar + username, Logout button
- Breadcrumb: Store / Profile

### Sections

1. **Profile Card**: Large avatar (first letter, gold gradient), username, member since date
2. **Balance Card**: Coins + Bonus display (same coin emoji as store page), VIP badge if active (gold gradient background, crown icon, plan name, expiry date), "Top up coins" link to store
3. **Order History**: Table with Date, Product, Amount, Coins, Bonus, Status columns. Empty state: "No orders yet." Status shown as green pill badge.

### JavaScript

- `loadProfile()` — fetches `/auth/me` and `/api/user/orders`, populates all UI elements
- `renderOrders(orders)` — builds HTML table from order array
- `handleLogout()` — calls `/auth/logout`, redirects to `/login`

---

## Store Page Integration (index.html)

### Auth Check

On page load, `checkAuth()` runs before PayPal init:
1. Calls `GET /auth/me`
2. If 401: redirect to `/login`
3. If OK: populate header (avatar letter + username), populate coins bar (coins + bonus)
4. Then call `initPayPal()`

### Header Changes

- Avatar replaced with clickable user area: avatar (first letter, gold gradient) + username text
- Links to `/profile`

### Coins Bar

- Balance numbers have IDs (`coins-display`, `bonus-display`) for dynamic updates
- Transaction History links to `/profile`

### After Payment

- `refreshBalance()` called after successful payment capture
- Fetches `/auth/me` and updates coins bar display

---

## Auth Flow

```
First Visit → GET / → no session → 302 /login → login.html
    ↓
Register/Login → POST /auth/register or /auth/login → session created
    ↓
Redirect → GET / → session valid → index.html
    ↓
JS: checkAuth() → GET /auth/me → populate header + coins bar → initPayPal()
    ↓
Payment → POST /api/orders → session stores pendingProductId
    ↓
PayPal popup → user approves → POST /api/orders/:id/capture
    ↓
Server: capture OK → credit user coins/bonus or VIP → record order
    ↓
JS: refreshBalance() → updated coins bar
    ↓
Profile → GET /profile → profile.html → loadProfile() → show balance + orders
    ↓
Logout → POST /auth/logout → session destroyed → redirect /login
```

---

## Color Palette (login.html & profile.html)

Same as store page, plus:

| Token | Value |
|---|---|
| Gold button gradient | `linear-gradient(135deg, #d4a03c, #b8862d)` |
| Avatar border | `#6b5230` |
| VIP badge bg | `linear-gradient(135deg, #4a3518, #2e1f0e)` |
| Table header bg | `#222222` |
| Table even row bg | `#161616` |
| Table odd row bg | `#1c1c1c` |
| Status pill | `#3fb950` on `rgba(35, 134, 54, 0.15)` |
| Logout hover | `#f87171` border `#e53935` |

---

## Notes

- All data is in-memory — lost on server restart (demo/prototype)
- SHA-256 password hashing is NOT production-grade (no salt, fast hash) — use bcrypt/argon2 in production
- No CSRF protection — acceptable for demo scope
- Default MemoryStore will show a console warning about memory leaks — expected for demo
- Direct access to `/login.html` or `/profile.html` via URL bypasses Express route handlers (served by express.static) — acceptable for demo
- Session cookie is not secure (HTTP) — set `secure: true` for HTTPS in production
