# QR Tools API Credits — SePay setup

## Product packs

- Starter: VND 29,000 for 10,000 API credits
- Growth: VND 99,000 for 50,000 API credits
- Business: VND 299,000 for 200,000 API credits

One API request consumes one prepaid credit only after a customer-owned key reaches its configured daily or monthly free quota. The per-minute rate limit always applies. System keys (keys with no `user_id`) cannot spend a customer wallet.

## Supabase migration

Apply `20261010120000_api_credit_wallets_and_sepay_purchases.sql` before deploying the Edge Functions or API code. It creates the wallet and purchase tables, an atomic payment-completion RPC, and updates the quota RPC to spend credits after free quotas are reached.

## Edge Function deployment

Deploy `api-credit-orders` and the updated `sepay-webhook` function.

The checkout function requires these Edge Function secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SEPAY_BANK_CODE` — SePay-supported bank code / BIN configured for the receiving account
- `SEPAY_BANK_ACCOUNT` — receiving bank account number
- `SEPAY_BANK_ACCOUNT_NAME` — optional account holder name

The existing `sepay-webhook` function also requires `SEPAY_WEBHOOK_SECRET`. Configure the SePay webhook security mode as HMAC-SHA256 and point it to:

`https://yatmdgjkljmaohdkvzkd.supabase.co/functions/v1/sepay-webhook`

Use the same secret value for the SePay webhook and `SEPAY_WEBHOOK_SECRET`. Do not store secrets in the repository or browser. SePay should send money-in events and include the payment code in the transaction `code` field. The generated QR's transfer description is the order code (prefix `QRC`).

## Operational checks before production

1. Apply the migration and deploy the functions.
2. Configure the bank details and webhook secret as Supabase Edge Function secrets.
3. Create a SePay webhook with HMAC-SHA256 and money-in events; send a test request.
4. Create a small real order and verify exact amount + order code matching.
5. Confirm the wallet balance increments exactly once even if SePay retries the same webhook.
6. Verify that an authenticated user can only see their own wallet and purchase history.
7. Verify free quota exhaustion spends one credit per accepted request, while the per-minute rate limit still blocks excess traffic.

Never mark an order paid based on the browser return URL or a screenshot. Only the authenticated webhook and the database RPC may credit the wallet.
