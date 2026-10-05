import type { ApiPrincipal } from "../auth/index.ts";

export interface ApiRateLimitPolicy {
  maxRequests: number;
  windowSeconds: number;
}

export interface ApiRateLimitRequest {
  principal: ApiPrincipal;
  policy: ApiRateLimitPolicy;
  nowEpochSeconds?: number;
}

export interface ApiRateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtEpochSeconds: number;
}

export interface ApiRateLimiter {
  check(request: ApiRateLimitRequest): Promise<ApiRateLimitDecision>;
}

export const API_RATE_LIMIT_EXCEEDED_CODE = "RATE_LIMIT_EXCEEDED" as const;

export function getApiRateLimitKey(principal: ApiPrincipal): string {
  return principal.keyId;
}

export function validateApiRateLimitPolicy(
  policy: ApiRateLimitPolicy,
): void {
  if (!Number.isInteger(policy.maxRequests) || policy.maxRequests <= 0) {
    throw new Error("API rate limit maxRequests must be a positive integer.");
  }

  if (!Number.isInteger(policy.windowSeconds) || policy.windowSeconds <= 0) {
    throw new Error("API rate limit windowSeconds must be a positive integer.");
  }
}
