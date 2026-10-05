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