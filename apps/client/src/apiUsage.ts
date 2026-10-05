import type {DeveloperSession} from '../../../src/developer-auth/types';
import {authHeader} from './auth';

const FUNCTION_URL=`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/developer-api-keys`;

async function request(session:DeveloperSession){
  const res=await fetch(`${FUNCTION_URL}?action=usage`,{
    headers:{...authHeader(session),'Content-Type':'application/json'},
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||`Request failed (${res.status})`);
  return data as UsageData;
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
