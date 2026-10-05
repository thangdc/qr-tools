import type { ApiPrincipal } from "../auth/index.ts";
import type { ApiRateLimitDecision, ApiRateLimitPolicy } from "../policy/rate-limit.ts";

export interface ApiHttpRequest {
  method: string;
  path: string;
  headers: Readonly<Record<string, string | undefined>>;
  body: unknown;
}

export interface ApiHttpResponse {
  status: number;
  headers: Readonly<Record<string, string>>;
  body: unknown;
}

export interface ApiRequestContext {
  principal: ApiPrincipal;
  rateLimit: ApiRateLimitDecision;
}

export interface ApiHttpDependencies {
  authenticate(request: ApiHttpRequest): Promise<ApiPrincipal | null>;
  rateLimit(
    principal: ApiPrincipal,
    policy: ApiRateLimitPolicy,
  ): Promise<ApiRateLimitDecision>;
}

export async function authenticateAndRateLimit(
  request: ApiHttpRequest,
  dependencies: ApiHttpDependencies,
  policy: ApiRateLimitPolicy,
): Promise<ApiRequestContext | ApiHttpResponse> {
  const authorization = request.headers.authorization ?? request.headers.Authorization ?? null;
  const principal = await dependencies.authenticate({
    ...request,
    headers: { ...request.headers, authorization },
  });

  if (!principal) {
    return {
      status: 401,
      headers: { "Content-Type": "application/json" },
      body: {
        error: {
          code: "API_AUTHENTICATION_REQUIRED",
          message: "Authentication is required.",
        },
      },
    };
  }

  const rateLimit = await dependencies.rateLimit(principal, policy);

  if (!rateLimit.allowed) {
    return {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.max(0, rateLimit.resetAtEpochSeconds - Math.floor(Date.now() / 1000))),
      },
      body: {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "API rate limit exceeded.",
        },
      },
    };
  }

  return { principal, rateLimit };
}
