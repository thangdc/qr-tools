# QR Tools

A lightweight QR code toolkit for generating, customizing, managing, importing, exporting, and printing QR codes, with VietQR and Pro features.

## Included

- QR generation: URL, text, contact, Wi-Fi, email, phone, SMS, location, VietQR payment
- QR customization and preview
- Local history
- Excel import/export and ZIP export
- Batch printing
- Pro license and manual payment flow
- Optional Supabase authentication and cloud sync

## Run locally

Serve the repository as a static site, for example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080/qr-code-generator.html`.

The app uses browser-side JavaScript and CDN dependencies; no build step is required.

## Source

Extracted from the QR Code Generator implementation on `thangdc/VietSoft` branch `ui/minimal-utility-foundation`. The extraction intentionally excludes unrelated VietSoft applications.
