import type {
  AuthConfig,
  DeveloperSession,
  DeveloperUser,
} from './types';

interface SupabaseAuthUser {
  id: string;
  email?: string | null;
}

interface SupabaseAuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: SupabaseAuthUser | null;
  id?: string;
  email?: string | null;
}

function getConfig(): AuthConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
    | string
    | undefined;

  if (!supabaseUrl || !publishableKey) {
    throw new Error('Developer authentication is not configured.');
  }

  return {supabaseUrl, publishableKey};
}

function authUrl(config: AuthConfig, path: string): string {
  return config.supabaseUrl.replace(/\/$/, '') + '/auth/v1/' + path;
}

function getUser(response: SupabaseAuthResponse): SupabaseAuthUser | null {
  if (response.user?.id) {
    return response.user;
  }

  if (response.id) {
    return {
      id: response.id,
      email: response.email ?? null,
    };
  }

  return null;
}

function toSession(response: SupabaseAuthResponse): DeveloperSession {
  const responseUser = getUser(response);

  if (!responseUser || !response.access_token || !response.refresh_token) {
    throw new Error('Authentication response did not include a complete session.');
  }

  const user: DeveloperUser = {
    id: responseUser.id,
    email: responseUser.email ?? null,
  };

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: response.expires_in
      ? Date.now() + response.expires_in * 1000
      : null,
    user,
  };
}

async function request(
  path: string,
  body: Record<string, unknown>,
): Promise<SupabaseAuthResponse> {
  const config = getConfig();
  const response = await fetch(authUrl(config, path), {
    method: 'POST',
    headers: {
      apikey: config.publishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as
    | SupabaseAuthResponse
    | {message?: string; msg?: string; error_description?: string};

  if (!response.ok) {
    const message =
      'message' in payload && payload.message
        ? payload.message
        : 'msg' in payload && payload.msg
          ? payload.msg
          : 'error_description' in payload && payload.error_description
            ? payload.error_description
            : 'Authentication request failed.';

    throw new Error(message);
  }

  return payload as SupabaseAuthResponse;
}

export function signIn(
  email: string,
  password: string,
): Promise<DeveloperSession> {
  return request('token?grant_type=password', {email, password}).then(toSession);
}

export async function signUp(
  email: string,
  password: string,
): Promise<DeveloperSession | null> {
  const response = await request('signup', {
    email,
    password,
    options: {
      email_redirect_to: 'https://client.thangdc.com',
    },
  });

  if (!response.access_token || !response.refresh_token) {
    return null;
  }

  return toSession(response);
}

export function refreshSession(
  refreshToken: string,
): Promise<DeveloperSession> {
  return request('token?grant_type=refresh_token', {
    refresh_token: refreshToken,
  }).then(toSession);
}

export async function signOut(accessToken: string): Promise<void> {
  const config = getConfig();
  const response = await fetch(authUrl(config, 'logout'), {
    method: 'POST',
    headers: {
      apikey: config.publishableKey,
      Authorization: 'Bearer ' + accessToken,
    },
  });

  if (!response.ok && response.status !== 401) {
    throw new Error('Unable to sign out.');
  }
}