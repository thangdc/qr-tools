import { signIn, signUp, refreshSession } from '../../../src/developer-auth/supabaseAuth';
import type { DeveloperSession } from '../../../src/developer-auth/types';

const STORAGE_KEY='qr-tools-developer-session';
export function getStoredSession(): DeveloperSession|null { const raw=sessionStorage.getItem(STORAGE_KEY); if(!raw)return null; try{return JSON.parse(raw) as DeveloperSession;}catch{return null;} }
function store(session:DeveloperSession){sessionStorage.setItem(STORAGE_KEY,JSON.stringify(session));}
export async function login(email:string,password:string){const session=await signIn(email,password);store(session);return session;}
export async function register(email:string,password:string){const session=await signUp(email,password);if(session)store(session);return session;}
export function logout(){sessionStorage.removeItem(STORAGE_KEY);}
export function authHeader(session:DeveloperSession){return {Authorization:`Bearer ${session.accessToken}`};}

export const AUTH_EXPIRED_EVENT = 'qr-tools-auth-expired';

export function notifyAuthExpired(): void {
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401) notifyAuthExpired();
  return response;
}

export function scheduleSessionRefresh(
  session: DeveloperSession,
  onRefreshed: (session: DeveloperSession) => void,
  onExpired: () => void,
): () => void {
  if (!session.expiresAt) return () => {};

  let cancelled = false;
  const delay = Math.max(0, session.expiresAt - Date.now() - 60_000);
  const timer = window.setTimeout(async () => {
    if (cancelled) return;
    try {
      const refreshed = await refreshSession(session.refreshToken);
      if (cancelled) return;
      store(refreshed);
      onRefreshed(refreshed);
      return;
    } catch {
      if (cancelled) return;
      logout();
      onExpired();
    }
  }, delay);

  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}
