# PayPal Capture Order API — Error Classification

> Based on `POST /v2/checkout/orders/{id}/capture` error responses.

---

## 1. PayPal Server / System Errors (PayPal 服务端问题)

Retry or wait.

| Error | Description | Action |
|-------|-------------|--------|
| `INTERNAL_SERVER_ERROR` | PayPal internal server error | Retry after delay |
| `RESOURCE_CONFLICT` | Server detected a conflict while processing | Wait and retry |
| `PREVIOUS_REQUEST_IN_PROGRESS` | A previous request on this resource is still processing | Space out requests, retry later |
| `ORDER_COMPLETION_IN_PROGRESS` | Order created with `ORDER_COMPLETE_ON_PAYMENT_APPROVAL`, PayPal is still capturing | Retry after a moment |

---

## 2. Authentication / Permission Errors (认证与权限问题)

API caller credentials or account configuration issues.

| Error | Description | Action |
|-------|-------------|--------|
| `AUTHENTICATION_FAILURE` | Missing or invalid authorization header | Check API credentials |
| `INVALID_ACCOUNT_STATUS` | Account validations failed | Verify merchant account status |
| `NOT_AUTHORIZED` | Insufficient permissions | Check API caller role |
| `CONSENT_NEEDED` | Consent is needed | Complete consent flow |
| `PERMISSION_DENIED` | No permission to access this resource | Check API caller permissions |
| `PERMISSION_DENIED_FOR_DONATION_ITEMS` | Not authorized for `category: DONATION` | Contact account manager |
| `NOT_ELIGIBLE_FOR_TOKEN_PROCESSING` | Not enabled to process this token type | Contact PayPal support |
| `NOT_ENABLED_FOR_CARD_PROCESSING` | API caller not set up for card payments | Contact PayPal support |
| `NOT_ENABLED_FOR_BANK_PROCESSING` | API caller not set up for bank payments | Contact account manager |
| `PAYEE_NOT_ENABLED_FOR_CARD_PROCESSING` | Payee not set up for card payments | Contact PayPal support |
| `PAYEE_NOT_ENABLED_FOR_BANK_PROCESSING` | Payee not set up for bank payments | Contact account manager |
| `NOT_ENABLED_FOR_PAYMENT_SOURCE` | API caller / payee not set up for this payment source | Contact account manager, allow 2 business days |
| `NOT_ELIGIBLE_FOR_PNREF_PROCESSING` | Not enabled for pnref processing | Contact PayPal support |
| `NOT_ELIGIBLE_FOR_PAYPAL_TRANSACTION_ID_PROCESSING` | Not enabled for PayPal transaction ID processing | Contact PayPal support |
| `PAYMENT_ORIGIN_NOT_ENABLED` | Not enabled for given `payment_origin` | Contact PayPal support |
| `VAULT_OWNER_ID_NOT_SUPPORTED` | Not enabled to specify vault `owner_id` | Contact account manager |
| `AUTH_CAPTURE_NOT_ENABLED` | Auth & Capture not enabled for merchant | Verify merchant is a verified business |
| `AUTO_CAPTURE_ENABLED` | Order is auto-captured, manual capture not allowed | Do not send capture request; order captured automatically |

---

## 3. Buyer / Payer Account Errors (买家账户问题)

Issues with the buyer's account, card, or payment method.

| Error | Description | Action |
|-------|-------------|--------|
| `PAYER_ACCOUNT_LOCKED_OR_CLOSED` | Payer account cannot be used | Buyer resolve with PayPal |
| `PAYER_ACCOUNT_RESTRICTED` | Payer account is restricted | Buyer resolve with PayPal |
| `PAYER_CANNOT_PAY` | Payer + payee settings prevent transaction | Buyer use different account/method |
| `INSTRUMENT_DECLINED` | Card / instrument declined by processor or bank | Buyer try different payment method |
| `CARD_BRAND_NOT_SUPPORTED` | Card brand not supported | Buyer use a different card brand |
| `CARD_COUNTRY_NOT_SUPPORTED` | Card issuing country not supported | Buyer use a card from a supported country |
| `CARD_DATA_NOT_FOUND` | Card issuer data could not be retrieved | Buyer use a different card |
| `REFERENCED_CARD_EXPIRED` | Card underlying the token has expired | Buyer update card or use different one |
| `CARD_NUMBER_REQUIRED` | Card number is required | Provide card number |
| `CARD_EXPIRY_REQUIRED` | Card expiry is required | Provide card expiry |
| `PAYMENT_DENIED` | PayPal declined this transaction | Buyer try again or use different method |
| `MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED` | Too many payment attempts | Wait and retry later |
| `REDIRECT_PAYER_FOR_ALTERNATE_FUNDING` | Transaction failed, payer needs alternate funding | Redirect buyer to select another source |
| `PAYER_ACTION_REQUIRED` | Transaction cannot complete, buyer must return to PayPal | Redirect buyer back to PayPal |
| `ORDER_NOT_APPROVED` | Payer has not yet approved the order | Redirect buyer to approve URL |
| `CONTINGENCY_NOT_SUCCESSFUL` | 3DS payer authentication failed | Buyer retry authentication |
| `BANK_VERIFICATION_REQUIRED` | Only verified bank accounts accepted | Buyer verify bank account first |
| `BANK_NOT_SUPPORTED_FOR_VERIFICATION` | Verification not supported for this bank | Buyer use different bank |
| `INVALID_IBAN` | IBAN is not a valid bank account number | Buyer provide correct IBAN |
| `IBAN_COUNTRY_NOT_SUPPORTED` | Issuer bank country not supported for SEPA | Buyer use supported bank |
| `CURRENCY_NOT_SUPPORTED_FOR_BANK` | Currency not supported (ACH=USD, SEPA=EUR) | Use correct currency |

---

## 4. Merchant / Payee Account Errors (卖家账户问题)

Issues with the payee / merchant account.

| Error | Description | Action |
|-------|-------------|--------|
| `SETUP_ERROR_FOR_BANK` | API caller bank payment setup incomplete | Contact account manager |
| `PLATFORM_FEE_PAYEE_CANNOT_BE_SAME_AS_PAYER` | Platform fee recipient cannot be the payer | Use different recipient |
| `PAYEE_FX_RATE_ID_EXPIRED` | FX Rate ID has expired | Use new FX Rate ID or remove it |
| `DOMESTIC_TRANSACTION_REQUIRED` | Payee and payer must be in same country | Only domestic transactions allowed |
| `TRANSACTION_RECEIVING_LIMIT_EXCEEDED` | Exceeds receiver's receiving limit | Merchant raise limit with PayPal |

---

## 5. Risk / Fraud Control Errors (风控问题)

Blocked by fraud protection, compliance, or transaction rules.

| Error | Description | Action |
|-------|-------------|--------|
| `PAYEE_BLOCKED_TRANSACTION` | Declined by Fraud Protection / Chargeback Protection | Review fraud settings in PayPal dashboard |
| `TRANSACTION_BLOCKED_BY_PAYEE` | Blocked by payee's Fraud Protection settings | Adjust fraud filter rules |
| `COMPLIANCE_VIOLATION` | Transaction declined due to compliance violation | Review transaction details |
| `TRANSACTION_REFUSED` | The request was refused | Check fraud rules and buyer history |
| `TRANSACTION_LIMIT_EXCEEDED` | Total payment amount exceeded transaction limit | Reduce amount or adjust limits |
| `PREVIOUS_TRANSACTION_REFERENCE_HAS_CHARGEBACK` | Referenced transaction has a chargeback | Use a different reference |

---

## 6. Order State Errors (订单状态问题)

Order is in an unexpected state for capture.

| Error | Description | Action |
|-------|-------------|--------|
| `ORDER_ALREADY_CAPTURED` | Order already captured (`intent=CAPTURE` allows only one) | Do not re-capture; check existing capture |
| `ORDER_NOT_APPROVED` | Payer has not approved the order yet | Redirect payer to approve URL |
| `ORDER_COMPLETION_IN_PROGRESS` | PayPal is auto-capturing, not yet done | Retry after a short delay |
| `AGREEMENT_ALREADY_CANCELLED` | Billing agreement already cancelled | Cannot reuse; create new agreement |
| `BILLING_AGREEMENT_NOT_FOUND` | Billing agreement token not found | Verify token value |
| `BILLING_AGREEMENT_ID_MISMATCH` | Billing agreement ID doesn't match order creation | Use matching billing agreement ID |
| `PREFERRED_PAYMENT_SOURCE_MISMATCH` | Payment source doesn't match order creation | Use matching payment source |
| `DECLINED_DUE_TO_RELATED_TXN` | Other transactions in this order failed (All or None) | Fix failing transaction and retry |

---

## 7. Parameter / Request Validation Errors (参数传递问题)

### 7.1 Request Format

| Error | Description | Action |
|-------|-------------|--------|
| `MALFORMED_REQUEST_JSON` | Request JSON is not well formed | Fix JSON syntax |
| `INVALID_REQUEST` | Request is syntactically incorrect or violates schema | Check request structure |

### 7.2 Missing Parameters

| Error | Location Examples | Action |
|-------|-------------------|--------|
| `MISSING_REQUIRED_PARAMETER` | `payment_source/token/id`, `token/type`, `vault/confirm_payment_token`, `vault/usage_type`, `vault/owner_id`, `card/network_token/number`, `card/network_token/expiry` | Add required field |
| `MISSING_PREVIOUS_REFERENCE` | Merchant-initiated network token needs `previous_network_transaction_reference` | Add reference |
| `MISSING_CRYPTOGRAM` | Customer-initiated network token needs cryptogram | Add cryptogram |
| `VAULT_INSTRUCTION_REQUIRED` | Vault instruction is required | Add `vault.store_in_vault` |
| `RETURN_URL_REQUIRED` | Return URL required when vaulting | Add `return_url` |
| `CANCEL_URL_REQUIRED` | Cancel URL required when vaulting | Add `cancel_url` |
| `REQUIRED_PARAMETER_FOR_CUSTOMER_INITIATED_PAYMENT` | Apple Pay: `transaction_amount`, `payment_data`, `payment_data_type`, `device_manufacturer_id` | Add required fields |

### 7.3 Invalid Values

| Error | Description | Action |
|-------|-------------|--------|
| `INVALID_PARAMETER_VALUE` | Value not valid (`intent`, `Prefer`, `token/type`) | Use correct enum value |
| `INVALID_PARAMETER_SYNTAX` | Value format incorrect (`usage_type`, `customer_type`, `confirm_payment_token`, `customer/id`) | Fix format |
| `INVALID_STRING_LENGTH` | Field value too short or too long (`token/id`, `customer/id`) | Adjust string length |
| `INVALID_SECURITY_CODE_LENGTH` | Security code length wrong for card brand | Fix CVV length |
| `INVALID_PICKUP_ADDRESS` | `shipping_option.type=PICKUP` requires name starting with `S2S` | Fix name format |
| `SHIPPING_ADDRESS_INVALID` | Shipping address is invalid | Fix address fields |
| `INVALID_RESOURCE_ID` | Specified resource ID does not exist | Verify order ID |
| `RESOURCE_NOT_FOUND` | The specified resource does not exist | Check resource ID |

### 7.4 Token / Reference Errors

| Error | Description | Action |
|-------|-------------|--------|
| `TOKEN_ID_NOT_FOUND` | Specified token not found | Verify token value |
| `INVALID_VAULT_ID` | Vault ID is invalid or not found | Use valid vault ID |
| `INVALID_VAULT_SETUP_TOKEN` | Vault setup token is invalid or not found | Use valid setup token |
| `PAYPAL_TRANSACTION_ID_NOT_FOUND` | PayPal transaction ID not found | Verify value |
| `PAYPAL_TRANSACTION_ID_EXPIRED` | PayPal transaction ID expired (4-year limit) | Use a newer reference |
| `PNREF_NOT_FOUND` | Specified pnref not found | Verify value |
| `PNREF_EXPIRED` | Pnref expired (15-month limit) | Use a newer reference |
| `IDENTIFIER_NOT_FOUND` | Specified identifier not found | Verify identifier |
| `INVALID_PREVIOUS_TRANSACTION_REFERENCE` | Referenced transaction not found or doesn't belong to payee | Use valid reference |
| `PREVIOUS_TRANSACTION_REFERENCE_VOIDED` | Referenced authorization is VOIDED | Use non-voided reference |
| `PAYMENT_SOURCE_MISMATCH` | Payment source doesn't match referenced transaction | Match payment source type |

### 7.5 Incompatible / Conflicting Parameters

| Error | Description | Action |
|-------|-------------|--------|
| `INCOMPATIBLE_PARAMETER_VALUE` | Field conflicts with other fields (`stored_payment_source`, `vault`, `stored_credential`, `processing_instruction`, `donation_context`, etc.) | Remove conflicting field |
| `DUPLICATE_INVOICE_ID` | Duplicate `invoice_id` detected | Use unique `invoice_id` per transaction |
| `APPLE_PAY_AMOUNT_MISMATCH` | Order amount doesn't match Apple Pay authorized amount | Re-authorize via Apple Pay |
| `PREFERRED_BRAND_NOT_SUPPORTED` | Preferred brand not supported | Use different brand |
| `PAYMENT_SOURCE_NOT_SUPPORTED` | Payment source not supported for multiple `purchase_units` | Use single unit |
| `INELIGIBLE_SHIPPING_OPTION` | Shipping option cannot be used with this order | Remove or change option |
| `ONLY_ONE_BANK_SOURCE_ALLOWED` | Multiple bank payment methods not supported | Use single bank source |
| `INCOMPATIBLE_ACCOUNT_OWNERSHIP_TYPE` | Account ownership type incompatible with entry class code | Fix ACH config |
| `COUNTRY_NOT_SUPPORTED_BY_PAYMENT_SOURCE` | Country not supported by this payment source | Use supported country |
| `LOCALE_NOT_SUPPORTED_BY_PAYMENT_SOURCE` | Locale not supported by this payment source | Use supported locale |

### 7.6 Vault Errors

| Error | Description | Action |
|-------|-------------|--------|
| `VAULT_INSTRUCTION_REQUIRED` | Vault instruction is required | Add `vault.store_in_vault` |
| `MISMATCHED_VAULT_ID_TO_PAYMENT_SOURCE` | Vault ID doesn't match payment source type | Match token type to source |
| `MISMATCHED_VAULT_OWNER_ID` | `owner_id` doesn't match API caller | Use correct `owner_id` |

### 7.7 Stored Credential / Merchant-Initiated Errors

| Error | Description | Action |
|-------|-------------|--------|
| `MERCHANT_INITIATED_WITH_SECURITY_CODE` | Cannot send `security_code` with `payment_initiator=MERCHANT` | Remove `security_code` |
| `MERCHANT_INITIATED_WITH_AUTHENTICATION_RESULTS` | Cannot send 3DS results with `payment_initiator=MERCHANT` | Remove 3DS results |
| `MERCHANT_INITIATED_WITH_MULTIPLE_PURCHASE_UNITS` | Merchant-initiated only supports single `purchase_unit` | Use one unit per order |

---

## Quick Reference: Error → Category

| Category | Key Errors |
|----------|-----------|
| **PayPal Server** | `INTERNAL_SERVER_ERROR`, `RESOURCE_CONFLICT`, `PREVIOUS_REQUEST_IN_PROGRESS`, `ORDER_COMPLETION_IN_PROGRESS` |
| **Auth / Permission** | `AUTHENTICATION_FAILURE`, `PERMISSION_DENIED`, `NOT_ENABLED_FOR_*`, `AUTO_CAPTURE_ENABLED` |
| **Buyer Account** | `PAYER_ACCOUNT_*`, `INSTRUMENT_DECLINED`, `CARD_BRAND_NOT_SUPPORTED`, `REFERENCED_CARD_EXPIRED`, `PAYMENT_DENIED`, `CONTINGENCY_NOT_SUCCESSFUL` |
| **Merchant Account** | `SETUP_ERROR_FOR_BANK`, `PAYEE_FX_RATE_ID_EXPIRED`, `TRANSACTION_RECEIVING_LIMIT_EXCEEDED` |
| **Risk / Fraud** | `PAYEE_BLOCKED_TRANSACTION`, `TRANSACTION_BLOCKED_BY_PAYEE`, `COMPLIANCE_VIOLATION`, `TRANSACTION_REFUSED` |
| **Order State** | `ORDER_ALREADY_CAPTURED`, `ORDER_NOT_APPROVED`, `AGREEMENT_ALREADY_CANCELLED`, `DECLINED_DUE_TO_RELATED_TXN` |
| **Missing Params** | `MISSING_REQUIRED_PARAMETER`, `VAULT_INSTRUCTION_REQUIRED`, `RETURN_URL_REQUIRED`, `CANCEL_URL_REQUIRED` |
| **Invalid Values** | `INVALID_PARAMETER_VALUE`, `INVALID_SECURITY_CODE_LENGTH`, `INVALID_RESOURCE_ID` |
| **Token / Reference** | `TOKEN_ID_NOT_FOUND`, `INVALID_VAULT_ID`, `PNREF_EXPIRED`, `PAYPAL_TRANSACTION_ID_EXPIRED` |
| **Conflicts** | `INCOMPATIBLE_PARAMETER_VALUE`, `DUPLICATE_INVOICE_ID`, `APPLE_PAY_AMOUNT_MISMATCH` |
