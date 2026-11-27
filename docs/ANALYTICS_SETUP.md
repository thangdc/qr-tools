# Analytics setup

The QR Tools app sends GA4 events only when `VITE_GA_MEASUREMENT_ID` is set at build time.

## Production

- The QR stream `15882561026` uses measurement ID `G-2S8WCS3WBQ`. The app defaults to it; `VITE_GA_MEASUREMENT_ID` may override it for future stream changes. Do not use `G-774V8J1SPG` — it belongs to stream `5858842636` (VietSofts).
- Keep the legacy `vietsofts.thangdc.com` page on `G-774V8J1SPG`; that is correct for stream `5858842636`.
- In GA4 Admin, remove `G-2S8WCS3WBQ` from the destinations of tag `G-774V8J1SPG`; its current config lists both IDs and copies VietSofts hits into the QR property.
- Analytics is disabled automatically on `localhost`, `127.0.0.1` and `*.local` to keep development hits out of production reports.

## Conversion tracking

- `pro_payment_confirmed` remains as a diagnostic custom event.
- `purchase` is now sent with `transaction_id`, `value`, `currency: 'VND'` and one line item when a paid order is confirmed.
- In GA4 Admin, mark `purchase` as a key event if conversion reporting is required. `totalRevenue` comes from `value`/`currency`.
- Verify with GA4 Realtime/DebugView and a real SePay test order after deployment.

## Verification query

- Check `hostName = qr.thangdc.com` and `streamId = 15882561026` before reading any QR report.
- Expected per 30 days after a clean deployment: only QR host sessions; no `localhost`; `purchase` count should match paid orders.
