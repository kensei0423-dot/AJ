# Order Error Testing

测试页面用于模拟 PayPal 订单流程中的各种错误场景，验证系统的错误处理和 `orderStats` 统计逻辑。

- **测试页面**: `GET /test` → `test.html`
- **Create Order 测试**: `POST /api/test/create-order`
- **Capture Order 测试**: `POST /api/test/capture-order`

---

## 触发方式

### Mock Header

PayPal sandbox 提供 `PayPal-Mock-Response` 请求头，用于模拟特定错误响应。将 `mock_application_codes` 设置为目标错误码即可触发。

**Header 格式:**

```
PayPal-Mock-Response: {"mock_application_codes": "<ERROR_CODE>"}
```

**完整请求示例 (Create Order):**

```http
POST https://api-m.sandbox.paypal.com/v2/checkout/orders
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
PayPal-Mock-Response: {"mock_application_codes": "INTERNAL_SERVER_ERROR"}

{
  "intent": "CAPTURE",
  "purchase_units": [
    {
      "description": "Test Order",
      "amount": { "currency_code": "USD", "value": "1.00" }
    }
  ]
}
```

**完整请求示例 (Capture Order):**

Capture 的 mock 测试需要先创建一个真实订单获取 order ID，再使用 mock header 发起 capture 请求：

```http
POST https://api-m.sandbox.paypal.com/v2/checkout/orders/<ORDER_ID>/capture
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
PayPal-Mock-Response: {"mock_application_codes": "INSTRUMENT_DECLINED"}
```

**可用的 mock_application_codes:**

| 错误码 | 适用 API | HTTP Status |
|--------|----------|-------------|
| `INTERNAL_SERVER_ERROR` | Create Order / Capture Order | 500 |
| `INSTRUMENT_DECLINED` | Capture Order | 422 |
| `TRANSACTION_REFUSED` | Capture Order | 422 |

### Natural Trigger

通过构造非法请求参数，让 PayPal API 自然返回真实错误响应。无需特殊 header。

| 错误码 | 触发方法 |
|--------|----------|
| `NOT_AUTHORIZED` | 使用无效 access token: `Authorization: Bearer INVALID_ACCESS_TOKEN_12345` |
| `RESOURCE_NOT_FOUND` | 使用不存在的 order ID: `POST /v2/checkout/orders/INVALID_ORDER_99999999XX/capture` |
| `ORDER_NOT_APPROVED` | 创建真实订单后，不经过买家审批直接 capture |

---

## Create Order Errors

### 1. INTERNAL_SERVER_ERROR (Mock)

PayPal 服务器内部错误。

- **触发方式**: Mock Header
- **HTTP Status**: `500`

**Request Header:**

```
PayPal-Mock-Response: {"mock_application_codes": "INTERNAL_SERVER_ERROR"}
```

**Response:**

```json
{
  "name": "INTERNAL_SERVER_ERROR",
  "message": "An internal service error has occurred"
}
```

### 2. NOT_AUTHORIZED (Natural)

使用无效的 access token 发起请求，认证失败。

- **触发方式**: Natural Trigger
- **HTTP Status**: `401`

**Request Header:**

```
Authorization: Bearer INVALID_ACCESS_TOKEN_12345
```

**Response:**

```json
{
  "error": "invalid_token",
  "error_description": "Token signature verification failed"
}
```

---

## Capture Order Errors

### 3. INTERNAL_SERVER_ERROR (Mock)

Capture 阶段 PayPal 服务器内部错误。

- **触发方式**: Mock Header（先创建真实订单，再用 mock header capture）
- **HTTP Status**: `500`

**Request Header:**

```
PayPal-Mock-Response: {"mock_application_codes": "INTERNAL_SERVER_ERROR"}
```

**Response:**

```json
{
  "name": "INTERNAL_SERVER_ERROR",
  "message": "An internal server error occurred."
}
```

### 4. RESOURCE_NOT_FOUND (Natural)

使用不存在的订单 ID 进行 capture。

- **触发方式**: Natural Trigger（使用 `INVALID_ORDER_99999999XX` 作为 order ID）
- **HTTP Status**: `404`

**Request:**

```
POST /v2/checkout/orders/INVALID_ORDER_99999999XX/capture
```

**Response:**

```json
{
  "name": "RESOURCE_NOT_FOUND",
  "details": [
    {
      "field": "order_id",
      "value": "INVALID_ORDER_99999999XX",
      "location": "path",
      "issue": "INVALID_RESOURCE_ID",
      "description": "Specified resource ID does not exist. Please check the resource ID and try again."
    }
  ],
  "message": "The specified resource does not exist.",
  "debug_id": "f207867615ecc",
  "links": [
    {
      "href": "https://developer.paypal.com/api/rest/reference/orders/v2/errors/#INVALID_RESOURCE_ID",
      "rel": "information_link",
      "method": "GET"
    }
  ]
}
```

### 5. INSTRUMENT_DECLINED (Mock)

支付工具被拒绝（如信用卡被银行拒绝）。

- **触发方式**: Mock Header（先创建真实订单，再用 mock header capture）
- **HTTP Status**: `422`

**Request Header:**

```
PayPal-Mock-Response: {"mock_application_codes": "INSTRUMENT_DECLINED"}
```

**Response:**

```json
{
  "name": "UNPROCESSABLE_ENTITY",
  "details": [
    {
      "issue": "INSTRUMENT_DECLINED",
      "description": "The instrument presented  was either declined by the processor or bank, or it can't be used for this payment."
    }
  ],
  "message": "The requested action could not be performed, semantically incorrect, or failed business validation.",
  "debug_id": "3fc230ceac4f5",
  "links": [
    {
      "href": "https://developer.paypal.com/docs/api/orders/v2/#error-INSTRUMENT_DECLINED",
      "rel": "information_link",
      "method": "GET"
    }
  ]
}
```

### 6. TRANSACTION_REFUSED (Mock)

交易被 PayPal 风控引擎拒绝。

- **触发方式**: Mock Header（先创建真实订单，再用 mock header capture）
- **HTTP Status**: `422`

**Request Header:**

```
PayPal-Mock-Response: {"mock_application_codes": "TRANSACTION_REFUSED"}
```

**Response:**

```json
{
  "name": "UNPROCESSABLE_ENTITY",
  "details": [
    {
      "issue": "TRANSACTION_REFUSED",
      "description": "The request was refused."
    }
  ],
  "message": "The requested action could not be completed, was semantically incorrect, or failed business validation.",
  "debug_id": "70c28ae654da",
  "links": [
    {
      "href": "https://developer.paypal.com/docs/api/orders/v2/#error-TRANSACTION_REFUSED",
      "rel": "information_link",
      "method": "GET"
    }
  ]
}
```

### 7. ORDER_NOT_APPROVED (Natural)

在买家未批准订单的情况下直接 capture。

- **触发方式**: Natural Trigger（创建真实订单后，不经过买家审批直接 capture）
- **HTTP Status**: `422`

**流程:**

```
1. POST /v2/checkout/orders → 创建订单，获取 order ID
2. POST /v2/checkout/orders/<ORDER_ID>/capture → 直接 capture（跳过买家审批）
```

**Response:**

```json
{
  "name": "UNPROCESSABLE_ENTITY",
  "details": [
    {
      "issue": "ORDER_NOT_APPROVED",
      "description": "Payer has not yet approved the Order for payment. Please redirect the payer to the 'rel':'approve' url returned as part of the HATEOAS links within the Create Order call or provide a valid payment_source in the request."
    }
  ],
  "message": "The requested action could not be performed, semantically incorrect, or failed business validation.",
  "debug_id": "f9823062ddef8",
  "links": [
    {
      "href": "https://developer.paypal.com/api/rest/reference/orders/v2/errors/#ORDER_NOT_APPROVED",
      "rel": "information_link",
      "method": "GET"
    }
  ]
}
```

---

## PayPal-Request-Id 幂等性

所有支付交易请求都携带 `PayPal-Request-Id` 头，用于 PayPal 端的幂等性保证。

### 生成规则

```js
function generateRequestId(username, productId, action) {
    const timeSlot = Math.floor(Date.now() / (30 * 60 * 1000)); // 30分钟时间窗
    return `${action}-${username}-${productId}-${timeSlot}`;
}
```

**格式**: `{action}-{username}-{productId}-{timeSlot}`

**示例**:

| 端点 | Request ID 示例 |
|------|----------------|
| Create Order | `create-test1-coins_500-912345` |
| Capture Order | `capture-test1-8AB12345XY-912345` |
| Saved Payment | `saved-test1-weekly_vip-912345` |

### 有效期

- 30 分钟内，同一用户对同一商品的请求生成相同的 Request ID
- 超过 30 分钟自动滚动到新的 `timeSlot`，生成新 ID
- PayPal 端：相同 Request ID 的重复请求返回幂等响应，不会重复扣款

### 请求头示例

```http
POST https://api-m.sandbox.paypal.com/v2/checkout/orders
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
PayPal-Request-Id: create-test1-coins_500-912345
```

---

## orderStats 统计逻辑

使用 `trackInitiated(requestId)` 替代直接 `orderStats.initiated++`，通过 Request ID 去重：

```js
const seenRequestIds = new Map(); // requestId → timestamp

function trackInitiated(requestId) {
    // 清理 >30分钟的过期条目
    // 已见过的 requestId 不重复计数 initiated
    if (seenRequestIds.has(requestId)) return false;
    seenRequestIds.set(requestId, now);
    orderStats.initiated++;
    return true;
}
```

### 去重效果

| 操作 | initiated | success | failed |
|------|-----------|---------|--------|
| 首次 Create 成功 | +1 | — | — |
| 30分钟内重复 Create 同一商品 | 不变 | — | — |
| 首次 Create 失败 | +1 | — | +1 |
| 30分钟内重复 Create 失败 | 不变 | — | +1 |
| Capture 成功 (COMPLETED) | — | +1 | — |
| Capture 失败 | — | — | +1 |
| Saved Payment 首次成功 | +1 | +1 | — |
| 30分钟内重复 Saved Payment | 不变 | +1 | — |
| 请求异常 (网络错误等) | +1 (首次) | — | +1 |

### 统计端点

`GET /api/admin/order-stats`

```json
{
  "initiated": 10,
  "success": 7,
  "failed": 3,
  "rate": "70.0"
}
```
