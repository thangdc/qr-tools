# Custom UI

## Two UI Models

### QR Tools UI

QR Tools hosts a configurable UI for customers who want no-code setup.

### Customer-owned UI

Customers can call the API/SDK and build their own experience.

Example:

Customer scanner → Customer backend → QR Tools resolve API → Customer UI.

## Why

QR Tools should provide infrastructure without forcing customers to replace their existing application.

## Customization

Future workflow configuration may expose:
- fields
- labels
- actions
- validation messages
- display rules
- action endpoints
- output mappings

Do not make arbitrary HTML/JavaScript execution the default customization model.
