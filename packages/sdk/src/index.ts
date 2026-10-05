import type { QrIdentity } from "../../qr-engine/src/index.ts";
import type { ScanAction } from "../../workflow-engine/src/scan.ts";
import type { WorkflowRecord } from "../../types/src/index.ts";

export interface QrToolsClientOptions {
  /** Public API origin, for example https://api.example.com. */
  baseUrl: string;
  /** Scoped API key. Do not use privileged secrets in browser code. */
  apiKey?: string;
  /** Optional fetch implementation for tests or custom runtimes. */
  fetch?: typeof globalThis.fetch;
}

export interface ScanRequest {
  payload: string;
}

export interface ScanResponse {
  identity: QrIdentity;
  record: WorkflowRecord | null;
  actions: ScanAction[];
}

export interface ExecuteActionRequest {
  payload: string;
  action: ScanAction;
}

export interface ExecuteActionResponse {
  success: true;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export class QrToolsApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    status: number,
    code: string,
    message: string,
  ) {
    super(message);
    this.name = "QrToolsApiError";
    this.status = status;
    this.code = code;
  }
}

export interface QrToolsClient {
  scan(request: ScanRequest): Promise<ScanResponse>;
  executeAction(
    request: ExecuteActionRequest,
  ): Promise<ExecuteActionResponse>;
}

function normalizeBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, "");

  if (!normalized) {
    throw new Error("QrToolsClient baseUrl is required.");
  }

  return normalized;
}

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  const body = await response.json() as T | ApiErrorResponse;

  if (!response.ok) {
    const error = body as ApiErrorResponse;
    throw new QrToolsApiError(
      response.status,
      error.error?.code ?? "API_REQUEST_FAILED",
      error.error?.message ?? "The API request failed.",
    );
  }

  return body as T;
}

export function createQrToolsClient(
  options: QrToolsClientOptions,
): QrToolsClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImpl = options.fetch ?? globalThis.fetch;

  if (!fetchImpl) {
    throw new Error("A fetch implementation is required.");
  }

  async function post<TRequest, TResponse>(
    path: string,
    request: TRequest,
  ): Promise<TResponse> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (options.apiKey) {
      headers.Authorization = `Bearer ${options.apiKey}`;
    }

    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    return parseResponse<TResponse>(response);
  }

  return {
    scan(request) {
      return post<ScanRequest, ScanResponse>(
        "/v1/qr/scan",
        request,
      );
    },

    executeAction(request) {
      return post<ExecuteActionRequest, ExecuteActionResponse>(
        "/v1/qr/actions/execute",
        request,
      );
    },
  };
}
