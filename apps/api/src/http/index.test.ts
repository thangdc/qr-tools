import { describe, expect, it } from "vitest";
import { authenticateAndRateLimit } from "./index.ts";

describe("authenticateAndRateLimit", () => {
  const policy = { maxRequests: 10, windowSeconds: 60 };

  it("rejects missing authentication before rate limiting", async () => {
    let rateLimitCalled = false;

    const result = await authenticateAndRateLimit(
      {
        method: "POST",
        path: "/v1/qr/scan",
        headers: {},
        body: {},
      },
      {
        authenticate: async () => null,
        rateLimit: async () => {
          rateLimitCalled = true;
          return {
            allowed: true,
            limit: 10,
            remaining: 9,
            resetAtEpochSeconds: 100,
          };
        },
      },
      policy,
    );

    expect(result).toMatchObject({
      status: 401,
      body: {
        error: { code: "API_AUTHENTICATION_REQUIRED" },
      },
    });
    expect(rateLimitCalled).toBe(false);
  });

  it("rejects rate-limited requests before Core delegation", async () => {
    const result = await authenticateAndRateLimit(
      {
        method: "POST",
        path: "/v1/qr/scan",
        headers: { authorization: "Bearer secret" },
        body: {},
      },
      {
        authenticate: async () => ({ keyId: "key-1", scopes: ["qr:scan"] }),
        rateLimit: async () => ({
          allowed: false,
          limit: 10,
          remaining: 0,
          resetAtEpochSeconds: 100,
        }),
      },
      policy,
    );

    expect(result).toMatchObject({
      status: 429,
      body: {
        error: { code: "RATE_LIMIT_EXCEEDED" },
      },
    });
  });

  it("returns an authenticated context when both checks pass", async () => {
    const result = await authenticateAndRateLimit(
      {
        method: "POST",
        path: "/v1/qr/scan",
        headers: { Authorization: "Bearer secret" },
        body: {},
      },
      {
        authenticate: async (request) => {
          expect(request.headers.authorization).toBe("Bearer secret");
          return { keyId: "key-1", scopes: ["qr:scan"] };
        },
        rateLimit: async (principal, receivedPolicy) => {
          expect(principal.keyId).toBe("key-1");
          expect(receivedPolicy).toEqual(policy);
          return {
            allowed: true,
            limit: 10,
            remaining: 9,
            resetAtEpochSeconds: 100,
          };
        },
      },
      policy,
    );

    expect(result).toMatchObject({
      principal: { keyId: "key-1" },
      rateLimit: { allowed: true, remaining: 9 },
    });
  });
});
