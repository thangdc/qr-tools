import { createQrToolsClient, QrToolsApiError } from "@qr-tools/sdk";

const baseUrlInput = document.querySelector<HTMLInputElement>("#base-url");
const apiKeyInput = document.querySelector<HTMLInputElement>("#api-key");
const payloadInput = document.querySelector<HTMLTextAreaElement>("#payload");
const scanButton = document.querySelector<HTMLButtonElement>("#scan");
const output = document.querySelector<HTMLPreElement>("#output");

if (!baseUrlInput || !apiKeyInput || !payloadInput || !scanButton || !output) {
  throw new Error("Consumer example UI is incomplete.");
}

scanButton.addEventListener("click", async () => {
  scanButton.disabled = true;
  output.textContent = "Scanning...";

  try {
    const client = createQrToolsClient({
      baseUrl: baseUrlInput.value,
      apiKey: apiKeyInput.value || undefined,
    });

    const result = await client.scan({ payload: payloadInput.value });
    output.textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    if (error instanceof QrToolsApiError) {
      output.textContent = `API error (${error.status}): ${error.code} - ${error.message}`;
      return;
    }
    output.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    scanButton.disabled = false;
  }
});
