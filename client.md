# ReelShort Store — Frontend Prompt (index.html)

## Overview

Create a single-page payment storefront for "ReelShort", a short-form video streaming platform. The page allows users to purchase VIP subscriptions or top-up coins via PayPal. Dark theme, modern card-based layout. All styles are inline within a single HTML file. Payment uses **PayPal JS SDK v6** (`https://www.sandbox.paypal.com/web-sdk/v6/core`) with popup checkout flow. The PayPal button in the Payment Methods row is the sole payment trigger — clicking it creates an order on the server, then opens a PayPal popup via the v6 SDK for user approval. On successful payment, a success modal is displayed and the user's coin balance is updated.

**Authentication required** — the page checks `GET /auth/me` on load and redirects to `/login` if not authenticated. See [user.md](user.md) for login/profile page details.

---

## Page Structure

### 1. Header

- **Background**: `#141414`, horizontal flex layout, padded `10px 40px`
- **Left side**:
  - **Logo**: 42×42px rounded square (`border-radius: 12px`), red gradient (`linear-gradient(135deg, #e8392c, #c62828)`), white bold letter "R" centered
  - **Nav links**: "Home", "Categories", "Fandom" — `#e0e0e0`, `15px`, `font-weight: 500`, `gap: 28px`, hover turns white
- **Right side** (`gap: 22px`):
  - **Search icon**: Material Design SVG magnifying glass, `22×22`, fill `#b0b0b0`, hover white
  - **Phone icon**: Material Design SVG smartphone, same style
  - **Globe icon**: Material Design SVG globe + small down-arrow `▾` next to it, same style
  - **User area**: clickable link to `/profile`, 34×34px avatar circle (gold gradient `#d4a03c`→`#b8862d`, 2px `#6b5230` border, first letter of username centered) + username text (`#d0d0d0`, `14px`)

### 2. Breadcrumb

- Background `#0d0d0d`, padding `14px 40px`
- Text: "Personal Center" (link to `/profile`, `#808080`) → `/` separator → "Store" (current, `#e0e0e0`, `font-weight: 500`)
- Font size `14px`

### 3. Coins Balance Bar

- **Wrapper**: separate background strip `#161616`, full width, padding `0 40px`
- **Inner container**: max-width `1120px`, centered, flex between, padding `18px 0`
- **Left**: "Coins: 🪙 **N** | Bonus: 🪙 **N**" (balance numbers have IDs `coins-display` and `bonus-display`, populated from `GET /auth/me`)
  - Coin icon is a CSS circle `22×22`, `radial-gradient(circle at 35% 35%, #ffd54f, #f9a825, #e65100)`, with inner ring via `::after` (10×10 circle, 1.5px semi-transparent white border)
  - Text `#d0d0d0`, number is bold white
  - Divider `|` in `#444`
- **Right**: "Transaction History ›" link to `/profile`, `#d0d0d0`, `14px`, hover white

### 4. VIP Subscription Section

- **Title**: "VIP Unlock all series for free" — `17px`, bold, white
- **Subtitle**: "Auto renew. Cancel anytime." — `13px`, `#808080`
- **Grid**: 2 columns, `gap: 16px`, `margin-bottom: 40px`

#### VIP Card

- Background: warm golden gradient `linear-gradient(135deg, #4a3518 0%, #2e1f0e 40%, #1a1208 70%, #111 100%)`
- Border: `1.5px solid #6b5230`, `border-radius: 12px`
- Padding: `22px 24px 20px`
- **Watermark**: `::before` — radial glow at right center; `::after` — `♛` character, `60px`, `rgba(212, 160, 60, 0.08)`, right side, vertically centered
- **Hover**: border `#a07830`, translateY(-2px), shadow `rgba(160, 120, 48, 0.15)`
- **Selected state**: border `#d4a03c`, double shadow glow
- **Content** (all `z-index: 1` to sit above watermark):
  - Label: "Weekly VIP" / "Yearly VIP" — `15px`, `font-weight: 600`, `#e8e0d0`
  - Price: "$19.99" / "$199.99" — `34px`, `font-weight: 800`, white
  - Renew text: "Auto-renew. Cancel anytime." — `13px`, `#908070`
  - Features row: flex, `gap: 36px`, each with emoji icon + text `13px`, `#c0b8a8`
    - 🎬 Unlimited Viewing
    - 📹 1080p High Quality

**Products**: `weekly_vip` ($19.99), `yearly_vip` ($199.99)

### 5. Top Up Coins Section

- **Title**: "Top up coins" — same `section-title` style
- **Grid**: 4 columns, `gap: 12px`

#### Coin Card

- Background `#1c1c1c`, border `1.5px solid #2d2d2d`, `border-radius: 10px`, padding `18px 16px`
- **Hover**: border `#4a4a4a`, translateY(-2px), shadow
- **Selected**: border `#d4a03c`, golden glow
- **Badge** (if bonus exists): absolute top-right, `background: #dc3545`, white text, `11px`, `font-weight: 700`, `padding: 2px 8px`, `border-radius: 4px`
- **Content**:
  - Amount: coin emoji + number, `22px`, `font-weight: 800`, white
  - Detail lines: "Immediately: X" / "Free: Y" — `13px`, `#808080`
  - Price: `18px`, `font-weight: 700`, white

**Products** (6 cards):
| Product ID | Amount | Badge | Immediately | Free | Price |
|---|---|---|---|---|---|
| `coins_2400` | 2,400 | +20% | 2,000 | 400 | $19.99 |
| `coins_1100` | 1,100 | +10% | 1,000 | 100 | $9.99 |
| `coins_500` | 500 | — | 500 | — | $4.99 |
| `coins_3900` | 3,900 | +30% | 3,000 | 900 | $29.99 |
| `coins_7500` | 7,500 | +50% | 5,000 | 2,500 | $49.99 |
| `coins_20000` | 20,000 | +100% | 10,000 | 10,000 | $99.99 |

### 6. Payment Methods

- **Title**: "Payment Methods" — `17px`, bold
- **Grid**: 3 columns, `gap: 12px`
- **Buttons**: `padding: 14px 20px`, border `1.5px solid #333`, bg `#1c1c1c`, `border-radius: 8px`, flex center
  1. **Quick Pay** — disabled, `opacity: 0.4`, has a small grey card icon via CSS (`.quickpay-icon`)
  2. **G Pay** — disabled, "G" letter uses `linear-gradient(135deg, #4285f4, #34a853, #fbbc05, #ea4335)` with `-webkit-background-clip: text` for Google colors
  3. **PayPal** — active (border `#5a8abf`, bg `rgba(0, 112, 186, 0.08)`), italic bold text, "Pay" in `#009cde`, "Pal" in `#003087`. This button is the **sole payment trigger** — clicking it calls `handlePayPal()` which creates an order on the server, then opens a PayPal popup via the v6 SDK. No separate SDK-rendered button below.

### 7. Status Message

- Hidden by default
- **Success**: green border `#238636`, bg `rgba(35, 134, 54, 0.1)`, text `#3fb950`
- **Error**: red border `#e53935`, bg `rgba(229, 57, 53, 0.1)`, text `#f87171`

### 8. Success Modal

- **Overlay** (`.modal-overlay`): fixed fullscreen, `background: rgba(0, 0, 0, 0.6)`, `z-index: 1000`, flexbox centered, hidden by default (`display: none`), shown via `.show` class (`display: flex`)
- **Modal box** (`.modal-box`): `background: #1e1e1e`, `border: 1px solid #333`, `border-radius: 16px`, `padding: 36px 40px`, centered text, `max-width: 380px`, `width: 90%`, deep shadow
- **Icon** (`.modal-icon`): 56×56px green circle, `background: rgba(35, 134, 54, 0.15)`, `border: 2px solid #238636`, white checkmark `✓` centered, `28px` font
- **Title** (`.modal-title`): "Recharge Successful" — `20px`, bold, white
- **Detail** (`.modal-detail`): order ID text — `14px`, `#999`
- **Amount** (`.modal-amount`): dollar amount — `24px`, `font-weight: 800`, `#3fb950` (green)
- **Button** (`.modal-btn`): green gradient `linear-gradient(135deg, #238636, #2ea043)`, white text, `border-radius: 8px`, `padding: 12px 40px`, hover `brightness(1.1)`, text "OK", calls `closeModal()`

### 9. Subscription Details Footer

- `margin-top: 36px`
- Title: "Subscription Details:" — `14px`, `font-weight: 600`, `#b0b0b0`
- Numbered list (no bullet, uses `data-num` attribute + `::before` pseudo-element):
  1. Unlimited access during active subscription
  2. Auto-renew notice + 24h pre-charge
  3. Cancel in app via Settings > Subscription Management
- Text: `13px`, `#666`, `line-height: 1.9`

---

## JavaScript Logic

### State

- `selectedProduct` — currently selected product ID string (e.g. `"weekly_vip"`, `"coins_2400"`)
- `sdkInstance` — PayPal SDK v6 instance, initialized on page load

### Auth Check on Load

- **`checkAuth()`**: called on page load, before PayPal init
  - `GET /auth/me` — if 401, redirect to `/login`
  - On success: populate header avatar (first letter) + username, populate coins bar from `user.coins` and `user.bonus`
  - Returns user object
- **Init sequence**: `checkAuth().then(user => { if (user) initPayPal(); })`

### PayPal JS SDK v6 Initialization

- **Script**: `<script src="https://www.sandbox.paypal.com/web-sdk/v6/core"></script>`
  - Use `www.sandbox.paypal.com` for sandbox mode, `www.paypal.com` for production
- **`initPayPal()`**: called after auth check, runs `paypal.createInstance()` with:
  - `clientId`: PayPal sandbox client ID
  - `components`: `['paypal-payments']`
- Stores result in `sdkInstance`

### Functions

#### `selectProduct(el)`
- Remove `.selected` from all `.vip-card` and `.coin-card`
- Add `.selected` to clicked element
- Set `selectedProduct` from `el.dataset.product`
- Clear any status message

#### `handlePayPal()`
1. Guard: if no `selectedProduct`, show error
2. Guard: if `sdkInstance` not ready, show loading message
3. Disable PayPal button
4. POST `/api/orders` with `{ productId: selectedProduct }` → receive `{ id }`
5. Create payment session: `sdkInstance.createPayPalOneTimePaymentSession()` with:
   - `orderId`: the order ID from server
   - `onApprove({ orderId })`: POST `/api/orders/{orderId}/capture` → if COMPLETED, call `showSuccessModal(orderId, amount)` + `refreshBalance()`; otherwise show error status
   - `onCancel()`: show "Payment cancelled" error
   - `onError(error)`: show error message
6. Start checkout popup: `session.start()`
7. On any error: show error status, re-enable button

#### `refreshBalance()`
- `GET /auth/me` and update `#coins-display` and `#bonus-display` with current user balance

#### `showStatus(message, type)` / `clearStatus()`
- Toggle `.status-message` visibility and class

#### `showSuccessModal(orderId, amount)`
- Set `#modal-order` text to `"Order: {orderId}"`
- Set `#modal-amount` text to `"${amount}"`
- Add `.show` class to `#success-modal` overlay

#### `closeModal()`
- Remove `.show` class from `#success-modal` overlay

---

## Responsive Breakpoints

### `max-width: 900px`
- Header/breadcrumb/coins-bar padding → `20px`
- Main content padding → `28px 20px 40px`
- VIP grid → 1 column
- Coins grid → 2 columns
- Payment methods → 1 column

### `max-width: 600px`
- Nav links hidden
- All horizontal padding → `16px`
- Coins grid → 2 columns (unchanged)

---

## Color Palette

| Token | Value |
|---|---|
| Page bg | `#0d0d0d` |
| Header bg | `#141414` |
| Coins bar bg | `#161616` |
| Card bg | `#1c1c1c` |
| Card border | `#2d2d2d` |
| VIP gradient start | `#4a3518` |
| VIP border | `#6b5230` |
| Gold accent | `#d4a03c` |
| Red badge | `#dc3545` |
| Text primary | `#ffffff` |
| Text secondary | `#d0d0d0` |
| Text muted | `#808080` |
| Text dim | `#666666` |
| PayPal blue | `#009cde` |
| PayPal dark | `#003087` |
| Success | `#238636` / `#3fb950` |
| Error | `#e53935` / `#f87171` |
| Modal bg | `#1e1e1e` |
| Modal border | `#333333` |
