import type {DeveloperSession} from '../../../src/developer-auth/types';
import {authHeader,authenticatedFetch} from './auth';

const FUNCTION_URL=`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/developer-api-keys`;

async function request(session:DeveloperSession){
  const res=await authenticatedFetch(`${FUNCTION_URL}?action=usage`,{
    headers:{...authHeader(session),'Content-Type':'application/json'},
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||`Request failed (${res.status})`);
  if(!data || typeof data !== 'object' || !data.summary || !data.summary.today || !data.summary.last7Days || !data.summary.last30Days){
    throw new Error(data?.error || 'Usage response is invalid. Please try again.');
  }
  return {
    summary:data.summary,
    statusBreakdown:Array.isArray(data.statusBreakdown)?data.statusBreakdown:[],
    endpointUsage:Array.isArray(data.endpointUsage)?data.endpointUsage:[],
    keyUsage:Array.isArray(data.keyUsage)?data.keyUsage:[],
    latestRequestAt:data.latestRequestAt ?? null,
  } as UsageData;
}

export type UsagePeriod={requests:number;successful:number;errors4xx:number;errors5xx:number};
export type UsageData={
  summary:{today:UsagePeriod;last7Days:UsagePeriod;last30Days:UsagePeriod};
  statusBreakdown:{statusCode:number;requests:number}[];
  endpointUsage:{endpoint:string;requests:number;successful:number;errors4xx:number;errors5xx:number}[];
  keyUsage:{id:string;name:string;status:string;requests:number;lastUsedAt:string|null;rateLimitPerMinute:number;currentMinuteRequests:number}[];
  latestRequestAt:string|null;
};

export const getUsage=(session:DeveloperSession)=>request(session);
