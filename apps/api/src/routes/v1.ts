import type {
  ApiErrorResponse,
  ExecuteActionRequest,
  ExecuteActionResponse,
  ScanRequest,
  ScanResponse,
} from "../contracts/v1.ts";
import { requireScope, type ApiPrincipal } from "../auth/index.ts";
import type { ApiHttpResponse } from "../http/index.ts";
import type {
  ScanAction,
  ScanActionHandler,
  ScanResult,
  ScanRuntime,
} from "../../../packages/workflow-engine/src/scan.ts";

export const API_SCOPE_QR_SCAN = "qr:scan" as const;
export const API_SCOPE_QR_ACTION_EXECUTE = "qr:action:execute" as const;

export interface PublicApiDependencies {
  scanRuntime: ScanRuntime & {
    executeAction(
      result: ScanResult,
      action: ScanAction,
      handler: ScanActionHandler,
    ): Promise<void>;
  };
  actionHandler: ScanActionHandler;
}

export interface PublicApiRequestContext {
  principal: ApiPrincipal;
}

function jsonResponse<T>(status: number, body: T): ApiHttpResponse {
  return {
    status,
    headers: { "Content-Type": "application/json" },
    body,
  };
}

function errorResponse(
  status: number,
  code: string,
  message: string,
): ApiHttpResponse {
  const body: ApiErrorResponse = {
    error: { code, message },
  };

  return jsonResponse(status, body);
}

export function createPublicApiV1(
  dependencies: PublicApiDependencies,
) {
  return {
    async scan(
      context: PublicApiRequestContext,
      request: ScanRequest,
    ): Promise<ApiHttpResponse> {
      try {
        requireScope(context.principal, API_SCOPE_QR_SCAN);
      } catch {
        return errorResponse(
          403,
          "API_SCOPE_FORBIDDEN",
          "The API key does not have the required scope.",
        );
      }

      if (!request.payload?.trim()) {
        return errorResponse(
          400,
          "INVALID_REQUEST",
          "The QR payload is required.",
        );
      }

      try {
        const result = await dependencies.scanRuntime.scan(request.payload);

        const response: ScanResponse = {
          identity: result.identity,
          record: result.record,
          actions: result.actions,
        };

        return jsonResponse(200, response);
      } catch {
        return errorResponse(
          400,
          "QR_SCAN_FAILED",
          "The QR payload could not be processed.",
        );
      }
    },

    async executeAction(
      context: PublicApiRequestContext,
      request: ExecuteActionRequest,
    ): Promise<ApiHttpResponse> {
      try {
        requireScope(context.principal, API_SCOPE_QR_ACTION_EXECUTE);
      } catch {
        return errorResponse(
          403,
          "API_SCOPE_FORBIDDEN",
          "The API key does not have the required scope.",
        );
      }

      if (!request.payload?.trim() || !request.action?.type?.trim()) {
        return errorResponse(
          400,
          "INVALID_REQUEST",
          "The QR payload and action are required.",
        );
      }

      try {
        const result = await dependencies.scanRuntime.scan(request.payload);
        await dependencies.scanRuntime.executeAction(
          result,
          request.action,
          dependencies.actionHandler,
        );

        const response: ExecuteActionResponse = { success: true };
        return jsonResponse(200, response);
      } catch {
        return errorResponse(
          400,
          "QR_ACTION_FAILED",
          "The QR action could not be executed.",
        );
      }
    },
  };
}
