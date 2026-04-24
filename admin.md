# Seller Admin Dashboard

## Overview

Seller Admin 是 ReelShort 项目的后台管理面板，用于管理用户和处理 PayPal 争议（disputes）。入口为 `/admin`，由 `admin.html` + `server.js` 中的 admin API 端点共同实现。

**访问地址**: `http://localhost:3777/admin`

---

## 页面结构

### Header

- Logo（红色渐变 "R"）+ 标题 "Seller Admin Dashboard"
- 右侧 "Back to Store" 返回商城首页

### Stats Bar（统计概览）

顶部展示 4 个统计卡片，数据来自 `/api/admin/users`：

| 统计项 | 说明 | 计算方式 |
|--------|------|----------|
| Total Users | 注册用户总数 | `allUsers.length` |
| Total Revenue | 总收入 | 所有用户订单金额求和 |
| Active VIP | 活跃 VIP 数 | VIP 未过期的用户数 |
| Saved Payment Methods | 已保存支付方式数 | 所有用户 `savedPaymentMethods` 求和 |

### Admin Tabs（主选项卡）

两个标签页切换：**Users** 和 **Disputes**，各自显示对应数量。

---

## Tab 1: Users（用户管理）

### 功能

- **搜索过滤**: 支持按用户名、PayPal 邮箱、Payment Token ID、Customer ID 搜索
- **用户卡片**: 可展开/折叠的用户详情卡片
- **用户概览**: 头像、用户名、注册时间、VIP 状态、Vault 状态、余额、订单数、消费总额

### 用户详情面板（展开后 3 个子 Tab）

#### 1. PayPal Info

展示 6 个信息卡片：

- PayPal Email
- Customer ID
- Account Balance（coins + bonus）
- Total Spent（金额 + 订单数）
- VIP Status（计划类型 + 到期时间 + 折扣）
- Save Payment Method（是否启用 + 方法数量）

#### 2. Saved Methods（已保存支付方式）

每个保存的支付方式显示：

- PayPal 图标 + 邮箱 + 保存日期
- Payment Token ID
- Customer ID

#### 3. Transactions（交易记录）

订单列表表格，字段：

| 列 | 说明 |
|----|------|
| Order ID | PayPal 订单 ID（等宽字体，蓝色） |
| Product | 商品名称 |
| Amount | 支付金额（绿色加粗） |
| Coins | 获得的 coins + bonus |
| Status | 订单状态（徽章样式） |
| Date | 创建时间 |

表格底部汇总：总消费、coin 购买次数、VIP 购买次数。

### API 端点

```
GET /api/admin/users
```

返回所有用户数据，包含：username, coins, bonus, vipStatus, savedPaymentMethods, orders, createdAt。

---

## Tab 2: Disputes（争议管理）

### 争议搜索（3 种方式）

三个搜索框并排显示，各自独立工作：

#### 1. Search by Order ID

- 输入 PayPal Order ID（如 `15369036YJ3074458`）
- **查询流程**:
  1. 调用 `GET /api/admin/disputes/search/order/:orderId`
  2. 服务端先通过 Orders v2 API 获取订单详情，提取 Capture ID
  3. 用 Capture ID 调用 Disputes API 的 `disputed_transaction_id` 参数搜索争议
  4. 去重后返回结果
- **显示信息**: Order Status, Amount, Payer Email, Capture IDs, Local User, Disputes Found
- 若有争议：显示争议列表表格（可点击查看详情）
- 若无争议：绿色提示 "No disputes found"

#### 2. Search by Case ID

- 输入 PayPal Dispute ID（如 `PP-D-12345` 或 `PP-R-CTA-10162678`）
- **查询流程**: 直接调用 `GET /api/admin/disputes/:disputeId` 获取争议详情
- **显示信息**: Status, Amount, Reason, Life Cycle Stage, Created/Updated
- 如有 Disputed Transactions：显示表格（Seller/Buyer Transaction ID, Amount, Buyer）
- 如有 Messages：显示消息列表

#### 3. Search by Transaction ID

- 输入 Capture/Transaction ID（如 `1RG78758WE8388359`）
- **查询流程**: 调用 `GET /api/admin/disputes?disputed_transaction_id=:txnId`
- **显示信息**: 匹配到的争议列表或 "No disputes found"
- 尝试匹配本地用户（通过订单 ID 或 captureId）

### 争议列表（All Disputes）

#### 过滤条件

- **From / To**: 日期范围筛选（ISO 时间）
- **Status**: 下拉选择争议状态
  - All、Required Action、Under Review、Resolved、Open
  - Waiting for Buyer、Waiting for Seller、Other
- **Search / Reset**: 执行搜索或重置

默认范围：最近 30 天。

#### 列表表格

| 列 | 说明 |
|----|------|
| Dispute ID | 红色等宽字体，可点击查看详情 |
| Reason | 争议原因 |
| Status | 状态徽章（不同颜色） |
| Amount | 争议金额（红色） |
| Transaction | Seller Transaction ID |
| User | 匹配的本地用户（金色徽章） |
| Created | 创建时间 |
| Updated | 更新时间 |

**用户匹配逻辑**: 服务端将争议的 `seller_transaction_id` 与本地用户的 `captureId` 和 `order id` 进行交叉比对。

### 争议详情 Modal

点击争议行弹出详情模态框（720px 宽），调用 `GET /api/admin/disputes/:disputeId` 获取完整数据。

包含以下信息区块：

#### Basic Information

- Status, Dispute Amount, Reason, Life Cycle Stage
- Dispute Channel, Dispute Flow
- Created / Updated 时间
- Seller Response Due Date（如有）
- External Reason Code（如有）
- Dispute State（如 REQUIRED_ACTION，橙色高亮）
- Dispute Outcome + Amount Refunded（如有）
- Allowed Refund Amount（如有）

#### Allowed Response Options

显示卖家可执行的操作：

- Accept Claim Types（如 REFUND）
- Make Offer Types（如 REFUND）
- Acknowledge Return Item
- Provide Evidence

#### Available Actions

从 API `links` 字段提取的可用操作（排除 `self`），如：
- provide-evidence
- accept-claim
- acknowledge-return-item

#### Disputed Transactions

每笔争议交易显示：
- Seller / Buyer Transaction ID
- Gross Amount, Transaction Status
- Buyer Name / Email
- Seller Name / Email / Merchant ID
- Transaction Date
- Seller Protection（是否有卖家保护）
- Items（商品明细：名称、数量、类型、原因）

#### Dispute Details (Extensions)

- **Billing Dispute Properties**: 重复交易、金额错误、未处理退款、未授权循环扣款、取消详情
- **Merchandise Dispute Properties**: 问题类型、子原因、购买 URL、商品描述、退货详情
- Buyer Contacted Time

#### Offers

当前及历史报价：
- Offer Type, Offer Amount
- Buyer Requested Amount
- History（Actor, Date, Event Type）

#### Evidence

证据列表：
- Evidence Type + Source
- Notes
- Tracking Info（承运商 + 追踪号）
- Refund IDs
- Documents（附件）

#### Communication Details

- Email, Phone, Note, Posted Time

#### Messages

消息列表（发送者 + 时间 + 内容 + 附件）

#### API Links

所有可用的 PayPal API 链接（Method + Rel）

---

## API 端点汇总

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin` | 返回 admin.html |
| GET | `/api/admin/users` | 获取所有用户数据 |
| GET | `/api/admin/disputes` | 查询争议列表（支持 start_time, dispute_state, disputed_transaction_id, page_size, end_time 参数） |
| GET | `/api/admin/disputes/:disputeId` | 获取单个争议详情 |
| GET | `/api/admin/disputes/search/order/:orderId` | 通过 Order ID 搜索争议（先查订单获取 Capture ID，再搜索争议） |

---

## 争议状态颜色映射

| 状态 | 颜色 | CSS Class |
|------|------|-----------|
| Open / Waiting for Seller Response | 红色 #f87171 | `dispute-status-open` |
| Waiting for Buyer Response | 金色 #d4a03c | `dispute-status-waiting_for_buyer_response` |
| Under Review | 蓝色 #58a6ff | `dispute-status-under_review` |
| Resolved | 绿色 #3fb950 | `dispute-status-resolved` |
| Other | 灰色 #888 | `dispute-status-other` |

---

## 技术实现

- **前端**: 纯 HTML/CSS/JavaScript，无框架依赖
- **主题**: 暗色主题（背景 #0d0d0d，卡片 #1a1a1a）
- **PayPal API**:
  - Customer Disputes v1 (`/v1/customer/disputes`)
  - Orders v2 (`/v2/checkout/orders`)
- **数据交叉匹配**: 服务端将 PayPal 争议与本地 users.json 中的订单数据进行匹配，通过 Capture ID 和 Order ID 关联用户
