import type { QrIdentity } from "../../../../packages/qr-engine/src/index.ts";
import type { ScanAction } from "../../../../packages/workflow-engine/src/scan.ts";
import type { WorkflowRecord } from "../../../../packages/types/src/index.ts";

export const PUBLIC_API_VERSION = "v1" as const;

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  error: ApiError;
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

export interface PublicApiRoutes {
  scan: {
    method: "POST";
    path: "/v1/qr/scan";
    request: ScanRequest;
    response: ScanResponse;
  };
  executeAction: {
    method: "POST";
    path: "/v1/qr/actions/execute";
    request: ExecuteActionRequest;
    response: ExecuteActionResponse;
  };
}
