import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigins = new Set(['https://client.thangdc.com','http://localhost:3000','http://localhost:5173']);

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : 'https://client.thangdc.com';
  return {'Access-Control-Allow-Origin': allowOrigin,'Access-Control-Allow-Headers': 'authorization, apikey, content-type','Access-Control-Allow-Methods': 'GET, POST, OPTIONS',Vary: 'Origin','Content-Type': 'application/json'};
}
function response(body: unknown,status: number,origin: string | null) {
  return new Response(JSON.stringify(body),{status,headers:corsHeaders(origin)});
}
function randomKey(): string {
  const bytes=new Uint8Array(32); crypto.getRandomValues(bytes);
  return 'qr_live_'+Array.from(bytes,(byte)=>byte.toString(16).padStart(2,'0')).join('');
}
async function sha256Hex(value: string): Promise<string> {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest),(byte)=>byte.toString(16).padStart(2,'0')).join('');
}
function maskKey(prefix: string): string { return prefix+'••••••••'; }

Deno.serve(async (req) => {
  const origin=req.headers.get('origin');
  if(req.method==='OPTIONS') return new Response(null,{status:204,headers:corsHeaders(origin)});
  if(!['GET','POST'].includes(req.method)) return response({error:'method_not_allowed'},405,origin);

  const authHeader=req.headers.get('authorization');
  if(!authHeader?.startsWith('Bearer ')) return response({error:'unauthorized'},401,origin);

  const supabaseUrl=Deno.env.get('SUPABASE_URL');
  const serviceRoleKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!supabaseUrl||!serviceRoleKey) return response({error:'server_not_configured'},500,origin);

  const userClient=createClient(supabaseUrl,Deno.env.get('SUPABASE_ANON_KEY')??serviceRoleKey,{global:{headers:{Authorization:authHeader}}});
  const adminClient=createClient(supabaseUrl,serviceRoleKey);
  const {data:userData,error:userError}=await userClient.auth.getUser();
  if(userError||!userData.user) return response({error:'unauthorized'},401,origin);
  const userId=userData.user.id;

  if(req.method==='GET'){
    const action=new URL(req.url).searchParams.get('action')||'keys';

    if(action==='usage'){
      const {data:apiKeys,error:keyError}=await adminClient.from('api_keys')
        .select('id,name,status,rate_limit_per_minute,created_at,last_used_at')
        .eq('user_id',userId).order('created_at',{ascending:false});
      if(keyError) return response({error:'usage_keys_failed'},500,origin);

      const keys=apiKeys??[], keyIds=keys.map(key=>key.id), now=new Date();
      const todayStart=new Date(now); todayStart.setHours(0,0,0,0);
      const sevenDaysAgo=new Date(now.getTime()-7*24*60*60*1000);
      const thirtyDaysAgo=new Date(now.getTime()-30*24*60*60*1000);
      const minuteAgo=new Date(now.getTime()-60*1000);

      type UsageLog={api_key_id:string;endpoint:string;status_code:number;success:boolean;duration_ms:number|null;created_at:string};
      const logs:UsageLog[]=[];
      if(keyIds.length){
        let from=0; const pageSize=1000;
        while(true){
          const {data,error}=await adminClient.from('api_request_logs')
            .select('api_key_id,endpoint,status_code,success,duration_ms,created_at')
            .in('api_key_id',keyIds).gte('created_at',thirtyDaysAgo.toISOString())
            .order('created_at',{ascending:false}).range(from,from+pageSize-1);
          if(error) return response({error:'usage_logs_failed'},500,origin);
          const page=(data??[]) as UsageLog[];
          logs.push(...page);
          if(page.length<pageSize) break;
          from+=pageSize;
        }
      }

      const count=(items:UsageLog[],predicate:(log:UsageLog)=>boolean)=>items.reduce((n,log)=>n+(predicate(log)?1:0),0);
      const aggregate=(items:UsageLog[])=>({
        requests:items.length,
        successful:count(items,log=>log.success),
        errors4xx:count(items,log=>log.status_code>=400&&log.status_code<500),
        errors5xx:count(items,log=>log.status_code>=500&&log.status_code<600),
      });

      const endpointMap=new Map<string,UsageLog[]>(), statusMap=new Map<number,number>();
      for(const log of logs){
        const endpointLogs=endpointMap.get(log.endpoint)??[];
        endpointLogs.push(log); endpointMap.set(log.endpoint,endpointLogs);
        statusMap.set(log.status_code,(statusMap.get(log.status_code)??0)+1);
      }
      const endpointUsage=Array.from(endpointMap.entries())
        .map(([endpoint,items])=>({endpoint,...aggregate(items)}))
        .sort((a,b)=>b.requests-a.requests);

      const minuteCounts=new Map<string,number>();
      for(const log of logs) if(new Date(log.created_at)>=minuteAgo)
        minuteCounts.set(log.api_key_id,(minuteCounts.get(log.api_key_id)??0)+1);

      const keyUsage=keys.map(key=>{
        const items=logs.filter(log=>log.api_key_id===key.id);
        return {id:key.id,name:key.name,status:key.status,requests:items.length,lastUsedAt:key.last_used_at,
          rateLimitPerMinute:key.rate_limit_per_minute,currentMinuteRequests:minuteCounts.get(key.id)??0};
      });

      return response({
        summary:{
          today:aggregate(logs.filter(log=>new Date(log.created_at)>=todayStart)),
          last7Days:aggregate(logs.filter(log=>new Date(log.created_at)>=sevenDaysAgo)),
          last30Days:aggregate(logs),
        },
        statusBreakdown:Array.from(statusMap.entries()).sort((a,b)=>a[0]-b[0])
          .map(([statusCode,requests])=>({statusCode,requests})),
        endpointUsage,keyUsage,latestRequestAt:logs[0]?.created_at??null,
      },200,origin);
    }

    const {data,error}=await adminClient.from('api_keys').select('id,name,key_prefix,status,rate_limit_per_minute,expires_at,created_at,last_used_at').eq('user_id',userId).order('created_at',{ascending:false});
    if(error) return response({error:'list_failed'},500,origin);
    return response({keys:(data??[]).map((key)=>({...key,key_masked:maskKey(key.key_prefix)}))},200,origin);
  }

  let body:{action?:string;id?:string;name?:string};
  try { body=await req.json(); } catch { return response({error:'invalid_json'},400,origin); }

  if(body.action==='create'){
    const name=body.name?.trim();
    if(!name||name.length>100) return response({error:'invalid_name'},400,origin);
    const key=randomKey(),keyHash=await sha256Hex(key);
    const {data,error}=await adminClient.from('api_keys').insert({user_id:userId,name,key_prefix:'qr_live_',key_hash:keyHash,status:'active',rate_limit_per_minute:60}).select('id,name,key_prefix,status,rate_limit_per_minute,expires_at,created_at,last_used_at').single();
    if(error) return response({error:'create_failed'},500,origin);
    return response({key:{...data,key_masked:maskKey(data.key_prefix),secret:key},warning:'Store this API key now. It will not be shown again.'},201,origin);
  }

  if(body.action==='revoke'){
    if(!body.id) return response({error:'invalid_id'},400,origin);
    const {data,error}=await adminClient.from('api_keys').update({status:'revoked'}).eq('id',body.id).eq('user_id',userId).eq('status','active').select('id,name,key_prefix,status,created_at').maybeSingle();
    if(error) return response({error:'revoke_failed'},500,origin);
    if(!data) return response({error:'not_found'},404,origin);
    return response({key:data},200,origin);
  }

  if(body.action==='rotate'){
    if(!body.id) return response({error:'invalid_id'},400,origin);
    const {data:oldKey,error:oldKeyError}=await adminClient.from('api_keys').select('id,name,rate_limit_per_minute,expires_at,status').eq('id',body.id).eq('user_id',userId).eq('status','active').maybeSingle();
    if(oldKeyError) return response({error:'lookup_failed'},500,origin);
    if(!oldKey) return response({error:'not_found'},404,origin);

    const key=randomKey(),keyHash=await sha256Hex(key);
    const {data:newKey,error:createError}=await adminClient.from('api_keys').insert({user_id:userId,name:body.name?.trim()||oldKey.name,key_prefix:'qr_live_',key_hash:keyHash,status:'active',rate_limit_per_minute:oldKey.rate_limit_per_minute,expires_at:oldKey.expires_at}).select('id,name,key_prefix,status,rate_limit_per_minute,expires_at,created_at,last_used_at').single();
    if(createError) return response({error:'rotate_failed'},500,origin);

    const {error:revokeError}=await adminClient.from('api_keys').update({status:'revoked'}).eq('id',oldKey.id).eq('user_id',userId).eq('status','active');
    if(revokeError){
      await adminClient.from('api_keys').update({status:'revoked'}).eq('id',newKey.id).eq('user_id',userId);
      return response({error:'rotate_failed'},500,origin);
    }
    return response({key:{...newKey,key_masked:maskKey(newKey.key_prefix),secret:key},warning:'Store this API key now. It will not be shown again. The previous key has been revoked.'},201,origin);
  }

  return response({error:'invalid_action'},400,origin);
});