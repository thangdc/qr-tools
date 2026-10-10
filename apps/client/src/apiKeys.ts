import type { DeveloperSession } from '../../../src/developer-auth/types';
import { authHeader, authenticatedFetch } from './auth';

const FUNCTION_URL=`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/developer-api-keys`;

async function request(session:DeveloperSession, init?:RequestInit){
  const res=await authenticatedFetch(FUNCTION_URL,{...init,headers:{...authHeader(session),'Content-Type':'application/json',...(init?.headers??{})}});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||`Request failed (${res.status})`);
  return data;
}
export type ApiKey={id:string;name:string;key_prefix:string;key_masked:string;status:string;rate_limit_per_minute:number;allowed_origins:string[];daily_request_limit:number|null;monthly_request_limit:number|null;expires_at:string|null;created_at:string;last_used_at:string|null};
export const listApiKeys=(s:DeveloperSession)=>request(s);
export type ApiKeyConfig={allowedOrigins:string[];rateLimitPerMinute:number;dailyRequestLimit:number;monthlyRequestLimit:number};
export const createApiKey=(s:DeveloperSession,name:string,config:ApiKeyConfig)=>request(s,{method:'POST',body:JSON.stringify({action:'create',name,...config})});
export const revokeApiKey=(s:DeveloperSession,id:string)=>request(s,{method:'POST',body:JSON.stringify({action:'revoke',id})});
export const rotateApiKey=(s:DeveloperSession,id:string)=>request(s,{method:'POST',body:JSON.stringify({action:'rotate',id})});