export interface DeveloperSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  user: DeveloperUser;
}

export interface DeveloperUser {
  id: string;
  email: string | null;
}

export interface AuthConfig {
  supabaseUrl: string;
  publishableKey: string;
}

export interface AuthError {
  message: string;
  status?: number;
}
