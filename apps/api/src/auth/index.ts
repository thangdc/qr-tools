export interface ApiPrincipal {
  keyId: string;
  scopes: readonly string[];
}

export interface ApiAuthenticationRequest {
  authorization: string | null;
}

export interface ApiAuthenticator {
  authenticate(request: ApiAuthenticationRequest): Promise<ApiPrincipal | null>;
}

export const API_AUTHORIZATION_SCHEME = "Bearer" as const;

export function getBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;

  const match = /^Bearer\\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() || null;
}

export interface AuthenticatedApiContext {
  principal: ApiPrincipal;
}

export function requireScope(
  principal: ApiPrincipal,
  scope: string,
): void {
  if (!principal.scopes.includes(scope)) {
    throw new Error("API scope is not authorized.");
  }
}
