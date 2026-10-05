import type { ExecuteActionRequest, ScanRequest } from "../contracts/v1.ts";
import {
  authenticateAndRateLimit,
  type ApiHttpRequest,
  type ApiHttpResponse,
} from "./index.ts";
import {
  createPublicApiV1,
  type PublicApiDependencies,
} from "../routes/v1.ts";
import type {
  ApiRateLimitPolicy,
  ApiRateLimitDecision,
} from "../policy/rate-limit.ts";
import type { ApiPrincipal } from "../auth/index.ts";

export interface PublicApiHttpRouterDependencies {
  authenticate(request: ApiHttpRequest): Promise<ApiPrincipal | null>;
  rateLimit(
    principal: ApiPrincipal,
    policy: ApiRateLimitPolicy,
  ): Promise<ApiRateLimitDecision>;
  scanRuntime: PublicApiDependencies["scanRuntime"];
  actionHandler: PublicApiDependencies["actionHandler"];
}

export interface PublicApiHttpRouterOptions {
  rateLimitPolicy: ApiRateLimitPolicy;
}

const JSON_CONTENT_TYPE = "application/json";

function errorResponse(
  status: number,
  code: string,
  message: string,
): ApiHttpResponse {
  return {
    status,
    headers: { "Content-Type": JSON_CONTENT_TYPE },
    body: {
      error: { code, message },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toScanRequest(body: unknown): ScanRequest | null {
  if (!isRecord(body) || typeof body.payload !== "string") {
    return null;
  }

  return { payload: body.payload };
}

function toExecuteActionRequest(body: unknown): ExecuteActionRequest | null {
  if (
    !isRecord(body) ||
    typeof body.payload !== "string" ||
    !isRecord(body.action) ||
    typeof body.action.type !== "string"
  ) {
    return null;
  }

  return {
    payload: body.payload,
    action: {
      type: body.action.type,
      ...(isRecord(body.action.data) ? { data: body.action.data } : {}),
    },
  };
}

export function createPublicApiHttpRouter(
  dependencies: PublicApiHttpRouterDependencies,
  options: PublicApiHttpRouterOptions,
) {
  const api = createPublicApiV1({
    scanRuntime: dependencies.scanRuntime,
    actionHandler: dependencies.actionHandler,
  });

  return async function handle(
    request: ApiHttpRequest,
  ): Promise<ApiHttpResponse> {
    if (request.method !== "POST") {
      return errorResponse(
        405,
        "METHOD_NOT_ALLOWED",
        "Only POST requests are supported.",
      );
    }

    const authenticated = await authenticateAndRateLimit(
      request,
      {
        authenticate: dependencies.authenticate,
        rateLimit: dependencies.rateLimit,
      },
      options.rateLimitPolicy,
    );

    if ("status" in authenticated) {
      return authenticated;
    }

    const context = { principal: authenticated.principal };

    if (request.path === "/v1/qr/scan") {
      const body = toScanRequest(request.body);

      if (!body) {
        return errorResponse(
          400,
          "INVALID_REQUEST",
          "The request body is invalid.",
        );
      }

      return api.scan(context, body);
    }

    if (request.path === "/v1/qr/actions/execute") {
      const body = toExecuteActionRequest(request.body);

      if (!body) {
        return errorResponse(
          400,
          "INVALID_REQUEST",
          "The request body is invalid.",
        );
      }

      return api.executeAction(context, body);
    }

    return errorResponse(
      404,
      "API_ROUTE_NOT_FOUND",
      "The requested API route was not found.",
    );
  };
}
