export interface QrToolsClientOptions {
  baseUrl: string;
  apiKey?: string;
}

export interface QrToolsClient {
  readonly options: QrToolsClientOptions;
}

export function createQrToolsClient(
  options: QrToolsClientOptions,
): QrToolsClient {
  return { options };
}
