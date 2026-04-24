# PayPal Create Order API — Error Classification

> Based on `POST /v2/checkout/orders` error responses.

---

## 1. Server / System Errors (PayPal 服务端问题)

These errors originate from PayPal's infrastructure. Retry or wait.

| Error | Description | Action |
|-------|-------------|--------|
| `INTERNAL_SERVER_ERROR` | PayPal internal server error | Retry after delay |
| `RESOURCE_CONFLICT` | Server detected a conflict while processing | Wait and retry |
| `PREVIOUS_REQUEST_IN_PROGRESS` | A previous request on this resource is still processing | Space out requests, retry later |

---

## 2. Authentication / Permission Errors (认证与权限问题)

Merchant account or API caller configuration issues.

| Error | Description | Action |
|-------|-------------|--------|
| `AUTHENTICATION_FAILURE` | Missing or invalid authorization header | Check API credentials |
| `INVALID_ACCOUNT_STATUS` | Account validations failed for the user | Verify merchant account status |
| `PERMISSION_DENIED` | No permission to access this resource | Check API caller permissions |
| `PERMISSION_DENIED_FOR_DONATION_ITEMS` | Not authorized to send `category: DONATION` | Contact account manager |
| `NOT_AUTHORIZED` | Insufficient permissions | Check API caller role |
| `NOT_ENABLED_FOR_CARD_PROCESSING` | API caller not set up for card payments | Contact PayPal support |
| `NOT_ENABLED_FOR_APPLE_PAY` | API caller / payee not set up for Apple Pay | Contact account manager |
| `NOT_ENABLED_FOR_GOOGLE_PAY` | API caller / payee not set up for Google Pay | Contact account manager |
| `NOT_ENABLED_FOR_PAYMENT_SOURCE` | API caller / payee not set up for this payment source | Contact account manager |
| `NOT_ENABLED_TO_VAULT_PAYMENT_SOURCE` | Not allowed to vault the given payment source | Contact PayPal support |
| `NOT_ELIGIBLE_FOR_PNREF_PROCESSING` | Not enabled to process with pnref | Contact PayPal support |
| `NOT_ELIGIBLE_FOR_PAYPAL_TRANSACTION_ID_PROCESSING` | Not enabled to process with PayPal transaction ID | Contact PayPal support |
| `PAYMENT_ORIGIN_NOT_ENABLED` | API caller / payee not enabled for given `payment_origin` | Contact PayPal support |
| `PAYEE_PRICING_TIER_ID_NOT_ENABLED` | Not enabled to specify `payee_pricing_tier_id` | Contact account manager |
| `PLATFORM_FEES_NOT_SUPPORTED` | Not enabled to specify `platform_fees` | Contact account manager |
| `SHIPPING_TYPE_NOT_SUPPORTED_FOR_CLIENT` | API caller not set up for `PICKUP_IN_PERSON` | Only for Platforms & Marketplaces |
| `DELAYED_DISBURSEMENT_NOT_SUPPORTED` | Not enabled for delayed disbursement mode | Contact account manager |
| `VAULT_OWNER_ID_NOT_SUPPORTED` | Not enabled to specify vault `owner_id` explicitly | Contact account manager |
| `PARTNER_OR_MERCHANT_RESTRICTED_FOR_COUNTRY` | Not allowed to process in this country | Contact PayPal support |

---

## 3. Buyer / Payer Account Errors (买家账户问题)

Issues with the buyer's PayPal account, card, or payment method.

| Error | Description | Action |
|-------|-------------|--------|
| `PAYER_ACCOUNT_LOCKED_OR_CLOSED` | Payer account cannot be used | Buyer needs to resolve with PayPal |
| `PAYER_ACCOUNT_RESTRICTED` | Payer account is restricted | Buyer needs to resolve with PayPal |
| `PAYER_CANNOT_PAY` | Payer + payee settings prevent this transaction | Buyer use different account or method |
| `INVALID_PAYER_ID` | Payer ID is not valid | Check payer ID |
| `INSTRUMENT_DECLINED` | Card / instrument declined by processor or bank | Buyer try different payment method |
| `CARD_EXPIRED` | The card is expired | Buyer use a different card |
| `PAYMENT_DENIED` | PayPal declined to process this transaction | Buyer try again or use different method |
| `PAYMENT_SOURCE_DECLINED_BY_PROCESSOR` | Payment source declined by processor | Create new order with different source |
| `PAYMENT_SOURCE_CANNOT_BE_USED` | Payment source cannot be used for this order | Try different payment source |
| `PAYMENT_SOURCE_INFO_CANNOT_BE_VERIFIED` | Name / billing / shipping address could not be verified | Correct info and retry |
| `MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED` | Too many payment attempts | Wait and retry later |
| `TOKEN_EXPIRED` | Payment token has expired | Re-authenticate, get new token |
| `ALIAS_DECLINED_BY_PROCESSOR` | Alias declined by processor (BLIK) | Create new order with different alias |
| `BANK_VERIFICATION_REQUIRED` | Only verified bank accounts can be processed | Buyer verify bank account first |
| `PAYER_NOT_SUPPORTED_BY_PAYMENT_SOURCE` | Payer was declined by payment source | Buyer try different method |

---

## 4. Merchant / Payee Account Errors (卖家账户问题)

Issues with the payee / merchant account.

| Error | Description | Action |
|-------|-------------|--------|
| `PAYEE_ACCOUNT_INVALID` | Payee account is invalid | Check `payee.email_address` or `payee.merchant_id` |
| `PAYEE_ACCOUNT_LOCKED_OR_CLOSED` | Merchant account is locked or closed | Contact PayPal |
| `PAYEE_ACCOUNT_RESTRICTED` | Merchant account is restricted | Contact PayPal |
| `INVALID_PLATFORM_FEES_ACCOUNT` | Platform fees payee account is invalid | Contact account manager |
| `AUTH_CAPTURE_NOT_ENABLED` | Auth & Capture not enabled for merchant | Verify merchant is a verified business |
| `PAYEE_FX_RATE_ID_EXPIRED` | FX Rate ID has expired | Use new FX Rate ID or remove it |
| `PAYEE_FX_RATE_ID_CURRENCY_MISMATCH` | FX Rate ID currency doesn't match order currency | Use matching FX Rate ID or remove it |
| `INVALID_FX_RATE_ID` | FX Rate ID is not valid or belongs to another API caller | Use valid FX Rate ID |
| `UNSUPPORTED_INTENT_FOR_KYC_INCOMPLETE_PAYEE` | `intent=AUTHORIZE` not supported due to incomplete KYC | Complete KYC, use `intent=CAPTURE` |
| `DELAYED_DISBURSEMENT_NOT_SUPPORTED_FOR_KYC_INCOMPLETE_PAYEE` | Delayed disbursement not supported due to incomplete KYC | Complete KYC |
| `PARTNER_SETTLEMENT_NOT_SUPPORTED_FOR_KYC_INCOMPLETE_PAYEE` | Partner settlement not supported due to incomplete KYC | Complete KYC |

---

## 5. Risk / Fraud Control Errors (风控问题)

Blocked by fraud protection or compliance rules.

| Error | Description | Action |
|-------|-------------|--------|
| `PAYEE_BLOCKED_TRANSACTION` | Declined by Fraud Protection / Chargeback Protection | Review fraud settings in PayPal dashboard |
| `TRANSACTION_BLOCKED_BY_PAYEE` | Blocked by payee's Fraud Protection settings | Adjust fraud filter rules |
| `COMPLIANCE_VIOLATION` | Transaction declined due to compliance violation | Review transaction details |
| `TRANSACTION_REFUSED` | The request was refused | Check fraud rules and buyer history |
| `TRANSACTION_LIMIT_EXCEEDED` | Total payment amount exceeded transaction limit | Reduce amount or adjust limits |
| `TRANSACTION_RECEIVING_LIMIT_EXCEEDED` | Exceeds receiver's receiving limit | Merchant raise limit with PayPal |
| `DOMESTIC_TRANSACTION_REQUIRED` | Requires payee and payer in same country | Only domestic transactions allowed |
| `PREVIOUS_TRANSACTION_REFERENCE_HAS_CHARGEBACK` | Referenced transaction has a chargeback | Use a different reference |

---

## 6. Parameter / Request Validation Errors (参数传递问题)

Request structure, format, or value issues. Fix in code before retrying.

### 6.1 Request Format

| Error | Description | Action |
|-------|-------------|--------|
| `MALFORMED_REQUEST_JSON` | Request JSON is not well formed | Fix JSON syntax |
| `MALFORMED_REQUEST` | Malformed request | Check request body |
| `PAYPAL_REQUEST_ID_REQUIRED` | `PayPal-Request-Id` header required when `payment_source` is present | Add the header |

### 6.2 Missing Parameters

| Error | Location Examples | Action |
|-------|-------------------|--------|
| `MISSING_REQUIRED_PARAMETER` | `intent`, `purchase_units`, `amount`, `amount/value`, `amount/currency_code`, `payment_source/token/id`, `card/expiry`, etc. | Add required field |
| `ITEM_TOTAL_REQUIRED` | When `items` provided, `amount.breakdown.item_total` is required | Add `item_total` to breakdown |
| `TAX_TOTAL_REQUIRED` | When `items.tax_total` provided, `amount.breakdown.tax_total` is required | Add `tax_total` to breakdown |
| `REFERENCE_ID_REQUIRED` | When multiple `purchase_units`, each needs `reference_id` | Add `reference_id` |
| `MISSING_PICKUP_ADDRESS` | `shipping.address` required for `shipping.type = PICKUP_IN_PERSON` | Add pickup address |
| `MISSING_PREVIOUS_REFERENCE` | Merchant-initiated network token needs `previous_network_transaction_reference` | Add reference |
| `MISSING_CRYPTOGRAM` | Customer-initiated network token needs cryptogram | Add cryptogram |
| `MISSING_SHIPPING_CALL_BACK_CONFIGURATION` | Shipping options require `order_update_callback_config` | Add callback config |
| `MISSING_ITEM_SHIPPING_OPTIONS` | All items need `options_ids` if any item has it | Add `options_ids` to all items |
| `MISSING_REQUIRED_PARAMETER_FOR_BILLING_PLAN` | Billing plan requires `usage_pattern` | Add `usage_pattern` |
| `BLIK_ONE_CLICK_MISSING_REQUIRED_PARAMETER` | BLIK one-click flow missing required params | Add `auth_code`, `alias_label`, or `alias_key` |
| `ONE_OF_PARAMETERS_REQUIRED` | One or more field is required to continue (e.g. `google_pay/token` or `google_pay/decrypted_token`) | Provide at least one of the required fields |

### 6.3 Invalid Values

| Error | Description | Action |
|-------|-------------|--------|
| `INVALID_PARAMETER_VALUE` | Value not valid (e.g. `intent`, `shipping_preference`, `category`) | Use correct enum value |
| `INVALID_PARAMETER_SYNTAX` | Value format incorrect (e.g. `locale`, `email`, `amount/value`) | Fix format |
| `INVALID_STRING_LENGTH` | Field value too short or too long | Adjust string length |
| `INVALID_COUNTRY_CODE` | Country code is invalid | Use valid ISO country code |
| `INVALID_CURRENCY_CODE` | Currency code invalid or unsupported | Use valid currency code |
| `INVALID_POSTAL_CODE` | Postal code can only contain letters, numbers, spaces, hyphens | Fix postal code |
| `INVALID_POSTAL_CODE_LENGTH` | Postal code max 9 letter/number characters | Shorten postal code |
| `INVALID_EXPIRY_DATE` | Expiry date invalid or not in the future | Use valid future date |
| `INVALID_SECURITY_CODE_LENGTH` | Security code length wrong for card brand | Fix CVV length |
| `INVALID_PAYEE_PRICING_TIER_ID` | Pricing tier ID not valid or not set up | Contact account manager |
| `INVALID_GOOGLE_PAY_TOKEN` | Google Pay token cannot be decrypted | Get new token |
| `INVALID_VAULT_ID` | Vault ID is invalid or not found | Use valid vault ID |
| `INVALID_SHIPPING_OPTION_ID` | Shipping option ID not found in `purchase_units.shipping.options` | Fix option ID |
| `INVALID_DELIVERY_ESTIMATE` | `delivery_time_max` must be > `delivery_time_min` | Fix delivery estimate |
| `NOT_SUPPORTED` | Field is not currently supported (e.g. `address_details`, `middle_name`) | Remove unsupported field |

### 6.4 Amount Mismatch

| Error | Description | Formula |
|-------|-------------|---------|
| `AMOUNT_MISMATCH` | Total doesn't match breakdown | `amount = item_total + tax_total + shipping + handling + insurance - shipping_discount - discount` |
| `ITEM_TOTAL_MISMATCH` | Item total doesn't match items | `item_total = SUM(unit_amount * quantity)` |
| `TAX_TOTAL_MISMATCH` | Tax total doesn't match items | `tax_total = SUM(tax * quantity)` |
| `DISCOUNT_TOTAL_MISMATCH` | Discount doesn't match breakdown | `discount = SUM(discount.breakdown)` |
| `INVALID_PLATFORM_FEES_AMOUNT` | Platform fees > order amount | Reduce platform fees |
| `APPLE_PAY_AMOUNT_MISMATCH` | Order amount doesn't match Apple Pay authorized amount | Re-authorize via Apple Pay |
| `BILLING_ITEM_AMOUNT_MISMATCH` | Billing plan unit amount should include setup fee + plan price | Fix billing amount |
| `PREFERRED_SHIPPING_OPTION_AMOUNT_MISMATCH` | Preferred shipping option amount doesn't match breakdown | Fix shipping amount |

### 6.5 Value Range

| Error | Description | Action |
|-------|-------------|--------|
| `CANNOT_BE_NEGATIVE` | Amount must be >= 0 | Use non-negative value |
| `CANNOT_BE_ZERO_OR_NEGATIVE` | Amount must be > 0 | Use positive value |
| `MAX_VALUE_EXCEEDED` | Must be <= 999999999999999.99 | Reduce amount |
| `DECIMAL_PRECISION` | Only two decimal places supported | Round to 2 decimals |
| `MAX_EXPIRY_TIME_EXCEEDED` | Authorization expiry too long | Use shorter expiry |

### 6.6 Array Constraints

| Error | Description | Action |
|-------|-------------|--------|
| `INVALID_ARRAY_MAX_ITEMS` | Too many items in array (e.g. `purchase_units`, `shipping/options`) | Reduce array size |
| `INVALID_ARRAY_MIN_ITEMS` | Too few items in array (e.g. `purchase_units`) | Add required items |

### 6.7 Incompatible / Conflicting Parameters

| Error | Description | Action |
|-------|-------------|--------|
| `INCOMPATIBLE_PARAMETER_VALUE` | Field conflicts with other fields in the order | Remove conflicting field |
| `DUPLICATE_REFERENCE_ID` | `reference_id` must be unique across `purchase_units` | Use unique IDs |
| `DUPLICATE_INVOICE_ID` | Duplicate `invoice_id` detected | Use unique `invoice_id` per transaction |
| `MULTI_CURRENCY_ORDER` | Multiple currencies not supported in one order | Use same currency for all units |
| `MULTIPLE_SHIPPING_ADDRESS_NOT_SUPPORTED` | Multiple shipping addresses not allowed | Use single address |
| `MULTIPLE_SHIPPING_TYPE_NOT_SUPPORTED` | Different `shipping.type` not supported across units | Use consistent type |
| `MULTIPLE_SHIPPING_OPTION_SELECTED` | Only one `shipping.option` can be `selected = true` | Select only one |
| `SHIPPING_OPTION_NOT_SELECTED` | At least one shipping option must be `selected = true` | Set one as selected |
| `SHIPPING_OPTIONS_NOT_SUPPORTED` | Shipping options not allowed with `NO_SHIPPING` or `SET_PROVIDED_ADDRESS` | Remove shipping options |
| `UNSUPPORTED_SHIPPING_TYPE` | Shipping type only supported with `SET_PROVIDED_ADDRESS` or `NO_SHIPPING` | Fix shipping preference |
| `UNSUPPORTED_INTENT` | `intent=AUTHORIZE` not supported for this operation | Use `intent=CAPTURE` |
| `UNSUPPORTED_PAYMENT_INSTRUCTION` | Payment instruction sent at wrong stage | Follow capture flow |
| `UNSUPPORTED_PROCESSING_INSTRUCTION` | Processing instruction not supported for this payment source | Check docs |
| `UNSUPPORTED_PAYMENT_SOURCE_FOR_SUBSCRIPTIONS` | Only `card` and `paypal` vault supported for subscriptions | Use supported source |
| `UNSUPPORTED_INTEGRATION_FOR_BILLING_PLAN` | Vaulting instruction mandatory for recurring purchases | Add vault + billing plan |
| `INCOMPATIBLE_PARAMETER_FOR_BILLING_PLAN` | Handling, insurance, discount not supported for recurring | Remove unsupported fields |
| `MULTIPLE_ITEM_CATEGORIES` | Cannot mix `DONATION` with `PHYSICAL_GOODS` / `DIGITAL_GOODS` | Use consistent category |
| `DONATION_ITEMS_NOT_SUPPORTED` | `DONATION` category only allows one `purchase_unit` | Use single unit |
| `MULTIPLE_PURCHASE_UNITS_NOT_SUPPORTED_FOR_PAYMENT_SOURCE` | Some payment sources don't support multiple units | Use single unit |
| `COUNTRY_NOT_SUPPORTED_BY_PAYMENT_SOURCE` | Country not supported by this payment source | Use supported country |
| `LOCALE_NOT_SUPPORTED_BY_PAYMENT_SOURCE` | Locale not supported by this payment source | Use supported locale |
| `PREFERRED_BRAND_NOT_SUPPORTED` | Preferred brand not supported for processing | Use different brand |
| `UNSUPPORTED_AUTHENTICATION_METHODS_FOR_PAYMENT_SOURCE` | Auth methods not supported for this payment source | Remove or change |
| `INCOMPATIBLE_ACCOUNT_OWNERSHIP_TYPE` | Account ownership type incompatible with entry class code | Fix ACH config |
| `BILLING_AGREEMENTS_CANNOT_BE_USED_FOR_SUBSCRIPTIONS` | Billing agreements cannot be used for subscription orders | Use vault instead |
| `SHIPPING_CALLBACK_CONFIG_NOT_SUPPORTED` | Callback URL not supported with `NO_SHIPPING` | Remove callback config |

### 6.8 Vault Errors

| Error | Description | Action |
|-------|-------------|--------|
| `VAULT_INSTRUCTION_DUPLICATED` | Only one vault instruction allowed | Use only `vault.store_in_vault` |
| `VAULT_INSTRUCTION_REQUIRED` | Vault instruction is required | Add `vault.store_in_vault` |
| `MISMATCHED_VAULT_ID_TO_PAYMENT_SOURCE` | Vault ID doesn't match payment source type | Match token type to source |
| `MISMATCHED_VAULT_SETUP_TOKEN_TO_PAYMENT_SOURCE` | Vault setup token doesn't match payment source | Match token type to source |
| `MISMATCHED_VAULT_OWNER_ID` | `owner_id` doesn't match API caller | Use correct `owner_id` |

### 6.9 Stored Credential / Network Token Errors

| Error | Description | Action |
|-------|-------------|--------|
| `MERCHANT_INITIATED_WITH_SECURITY_CODE` | Cannot send `security_code` with `payment_initiator=MERCHANT` | Remove `security_code` |
| `MERCHANT_INITIATED_WITH_AUTHENTICATION_RESULTS` | Cannot send 3DS results with `payment_initiator=MERCHANT` | Remove 3DS results |
| `MERCHANT_INITIATED_WITH_MULTIPLE_PURCHASE_UNITS` | Merchant-initiated payments only support single `purchase_unit` | Use one unit per order |
| `INVALID_PREVIOUS_TRANSACTION_REFERENCE` | Referenced transaction not found or doesn't belong to payee | Use valid reference |
| `PREVIOUS_TRANSACTION_REFERENCE_VOIDED` | Referenced authorization is VOIDED | Use non-voided reference |
| `PAYMENT_SOURCE_MISMATCH` | Payment source doesn't match referenced transaction | Match payment source |
| `REQUIRED_PARAMETER_FOR_CUSTOMER_INITIATED_PAYMENT` | Missing required fields for customer-initiated payment | Add required Apple Pay fields |
| `CRYPTOGRAM_REQUIRED` | Cryptogram required for `CRYPTOGRAM_3DS` auth method | Add cryptogram |
| `EMV_DATA_REQUIRED` | EMV data required for EMV auth method | Add EMV data |
| `GOOGLE_PAY_GATEWAY_MERCHANT_ID_MISMATCH` | Gateway merchant ID in token doesn't match API caller | Fix merchant config |

### 6.10 Billing Address Errors

| Error | Description | Action |
|-------|-------------|--------|
| `BILLING_ADDRESS_INVALID` | Billing address is invalid | Fix address fields |
| `SHIPPING_ADDRESS_INVALID` | Shipping address is invalid | Fix address fields |
| `CITY_REQUIRED` | Specified country requires a city (`admin_area_2`) | Add city |
| `POSTAL_CODE_REQUIRED` | Specified country requires a postal code | Add postal code |

### 6.11 Other Validation

| Error | Description | Action |
|-------|-------------|--------|
| `AGREEMENT_ALREADY_CANCELLED` | Billing agreement already cancelled | Cannot reuse |
| `BILLING_AGREEMENT_NOT_FOUND` | Billing agreement token not found | Use valid token |
| `PAYPAL_TRANSACTION_ID_NOT_FOUND` | Specified `paypal_transaction_id` not found | Verify value |
| `PNREF_NOT_FOUND` | Specified `pnref` not found | Verify value |
| `ORDER_COMPLETE_ON_PAYMENT_APPROVAL` | `ORDER_COMPLETE_ON_PAYMENT_APPROVAL` required for this payment source | Set processing instruction |
| `INELIGIBLE_SHIPPING_OPTION` | Shipping option cannot be used with this order | Remove or change option |

---

## Quick Reference: Error → Category

| Category | Key Errors |
|----------|-----------|
| **PayPal Server** | `INTERNAL_SERVER_ERROR`, `RESOURCE_CONFLICT`, `PREVIOUS_REQUEST_IN_PROGRESS` |
| **Auth / Permission** | `AUTHENTICATION_FAILURE`, `PERMISSION_DENIED`, `NOT_ENABLED_FOR_*` |
| **Buyer Account** | `PAYER_ACCOUNT_*`, `INSTRUMENT_DECLINED`, `CARD_EXPIRED`, `PAYMENT_DENIED` |
| **Merchant Account** | `PAYEE_ACCOUNT_*`, `AUTH_CAPTURE_NOT_ENABLED`, `*_KYC_INCOMPLETE_*`, `*_FX_RATE_ID_*` |
| **Risk / Fraud** | `PAYEE_BLOCKED_TRANSACTION`, `TRANSACTION_BLOCKED_BY_PAYEE`, `COMPLIANCE_VIOLATION` |
| **Amount** | `AMOUNT_MISMATCH`, `ITEM_TOTAL_MISMATCH`, `TAX_TOTAL_MISMATCH`, `DECIMAL_PRECISION` |
| **Missing Params** | `MISSING_REQUIRED_PARAMETER`, `ITEM_TOTAL_REQUIRED`, `REFERENCE_ID_REQUIRED` |
| **Invalid Values** | `INVALID_PARAMETER_VALUE`, `INVALID_COUNTRY_CODE`, `INVALID_CURRENCY_CODE` |
| **Conflicts** | `INCOMPATIBLE_PARAMETER_VALUE`, `DUPLICATE_INVOICE_ID`, `MULTI_CURRENCY_ORDER` |
| **Vault** | `VAULT_INSTRUCTION_*`, `MISMATCHED_VAULT_*`, `INVALID_VAULT_ID` |
