# SDK Integration Example

This is the reference integration for an existing customer application.

The intended flow is:

1. Existing application receives a QR payload from its scanner.
2. The application calls `scan()`.
3. QR Tools resolves the QR identity and workflow record.
4. The application renders the returned record and allowed actions.
5. The user selects an action.
6. The application calls `executeAction()`.
7. QR Tools validates the action again before executing it.

The customer keeps ownership of the UI and scanner. QR Tools owns QR resolution, workflow authorization, and action validation.

## Browser application

Install the SDK in the customer application:

```bash
npm install @qr-tools/sdk
```

Then keep the integration small and application-owned:

```ts
import {
  createQrToolsClient,
  QrToolsApiError,
  type ScanResponse,
  type ScanAction,
} from "@qr-tools/sdk";

const qr = createQrToolsClient({
  baseUrl: "https://api.example.com",
  // Only use a client-safe credential here.
  // Never put a privileged server API key in browser code.
  apiKey: "client-scoped-key",
});

async function handleQrScan(payload: string) {
  try {
    const result = await qr.scan({ payload });

    renderQrResult(result);
  } catch (error) {
    handleQrError(error);
  }
}

function renderQrResult(result: ScanResponse) {
  const record = result.record;

  if (!record) {
    renderMessage("QR code is valid, but its record is not available.");
    return;
  }

  renderRecord({
    title: String(record.data.name ?? record.recordId),
    workflow: result.identity.workflowId,
    recordId: result.identity.recordId,
  });

  renderActions(result.actions);
}

function renderActions(actions: ScanAction[]) {
  for (const action of actions) {
    renderActionButton(action, async () => {
      try {
        await qr.executeAction({
          payload: currentQrPayload(),
          action,
        });

        renderMessage("Action completed.");
      } catch (error) {
        handleQrError(error);
      }
    });
  }
}

function handleQrError(error: unknown) {
  if (error instanceof QrToolsApiError) {
    // Branch on the stable error code, not the human-readable message.
    renderMessage(`QR Tools error: ${error.code}`);
    return;
  }

  renderMessage("Unable to process the QR code.");
}
```

The functions `renderQrResult`, `renderRecord`, `renderActionButton`, `renderMessage`, and `currentQrPayload` are intentionally application-owned. The SDK does not impose a UI framework.

## Server application

If the integration uses a privileged API key, keep the SDK on the server:

```ts
import { createQrToolsClient } from "@qr-tools/sdk";

const qr = createQrToolsClient({
  baseUrl: "https://api.example.com",
  apiKey: process.env.QR_TOOLS_API_KEY,
});

export async function processQr(payload: string) {
  const result = await qr.scan({ payload });

  return {
    workflowId: result.identity.workflowId,
    recordId: result.identity.recordId,
    record: result.record,
    actions: result.actions,
  };
}
```

The browser can call the customer's server instead of receiving the privileged API key.

## Important boundary

Do not copy QR Tools Core logic into the customer application.

The customer integration should only:

- capture the QR payload;
- call `scan()`;
- render the returned record;
- render the returned allowed actions;
- call `executeAction()` for the selected action;
- handle stable API error codes.

QR Tools remains responsible for:

- QR identity verification;
- workflow and record resolution;
- authorization of allowed actions;
- action validation at execution time;
- privileged credentials and infrastructure.

This example is the canonical starting point for customer-owned UI integrations.
