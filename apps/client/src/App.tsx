import React,{useEffect,useState} from 'react';
import {Activity,BarChart3,Check,Copy,KeyRound,LogOut,Plus,RotateCw,ShieldCheck,Trash2,BookOpen,Code as CodeIcon} from 'lucide-react';
import type {DeveloperSession} from '../../../src/developer-auth/types';
import {getStoredSession,login,logout,register} from './auth';
import {createApiKey,listApiKeys,revokeApiKey,rotateApiKey,type ApiKey} from './apiKeys';
import {getUsage,type UsageData,type UsagePeriod} from './apiUsage';

function App(){
  const [session,setSession]=useState<DeveloperSession|null>(getStoredSession());
  const [registerMode,setRegisterMode]=useState(false);
  if(!session) return <AuthScreen registerMode={registerMode} setRegisterMode={setRegisterMode} onAuth={setSession}/>;
  return <Dashboard session={session} onLogout={()=>{logout();setSession(null)}}/>;
}
function AuthScreen({registerMode,setRegisterMode,onAuth}:{registerMode:boolean;setRegisterMode:(v:boolean)=>void;onAuth:(s:DeveloperSession)=>void}){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setSuccess('');try{if(registerMode){const session=await register(email,password);if(session){onAuth(session);}else{setSuccess('Account created. Check your email and confirm your address before signing in.');setRegisterMode(false);}}else{onAuth(await login(email,password));}}catch(err){setError(err instanceof Error?err.message:'Authentication failed');}finally{setBusy(false)}}
  return <main className="auth-shell"><section className="auth-card"><div className="brand"><div className="brand-mark"><KeyRound/></div><div><strong>QR Tools</strong><span>Developer Portal</span></div></div><h1>{registerMode?'Create developer account':'Sign in'}</h1><p className="muted">Manage API keys and integrate with the QR Tools API.</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} autoComplete={registerMode?'new-password':'current-password'}/></label>{error&&<div className="error">{error}</div>}{success&&<div className="success">{success}</div>}<button className="primary" disabled={busy}>{busy?'Please wait…':registerMode?'Create account':'Sign in'}</button></form><button className="link" onClick={()=>{setRegisterMode(!registerMode);setError('');setSuccess('')}}>{registerMode?'Already have an account? Sign in':'Need an account? Create one'}</button></section></main>
}

type Page='keys'|'usage'|'api-test'|'docs'|'integrations';
function Dashboard({session,onLogout}:{session:DeveloperSession;onLogout:()=>void}){
  const [page,setPage]=useState<Page>('keys');
  const [keys,setKeys]=useState<ApiKey[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [showCreate,setShowCreate]=useState(false);
  const [name,setName]=useState('');
  const [secret,setSecret]=useState('');
  const [copied,setCopied]=useState(false);

  async function refreshKeys(){setLoading(true);setError('');try{const d=await listApiKeys(session);setKeys(d.keys??[])}catch(e){setError(e instanceof Error?e.message:'Unable to load API keys')}finally{setLoading(false)}}
  useEffect(()=>{void refreshKeys()},[]);

  async function create(){if(!name.trim())return;try{const d=await createApiKey(session,name.trim());setSecret(d.key.secret);setName('');setShowCreate(false);await refreshKeys()}catch(e){setError(e instanceof Error?e.message:'Create failed')}}
  async function revoke(id:string){if(!confirm('Revoke this API key? Existing integrations using it will stop working.'))return;try{await revokeApiKey(session,id);await refreshKeys()}catch(e){setError(e instanceof Error?e.message:'Revoke failed')}}
  async function rotate(id:string){if(!confirm('Rotate this API key? The current key will stop working.'))return;try{const d=await rotateApiKey(session,id);setSecret(d.key.secret);await refreshKeys()}catch(e){setError(e instanceof Error?e.message:'Rotate failed')}}
  async function copy(){await navigator.clipboard.writeText(secret);setCopied(true);setTimeout(()=>setCopied(false),1500)}

  return <div className="app"><header><div className="brand"><div className="brand-mark"><KeyRound/></div><div><strong>QR Tools</strong><span>Developer Portal</span></div></div><div className="account"><span>{session.user.email}</span><button className="icon-button" title="Sign out" onClick={onLogout}><LogOut size={18}/></button></div></header><aside><nav><button className={page==='keys'?'nav-link active':'nav-link'} onClick={()=>setPage('keys')}><KeyRound size={17}/>API Keys</button><button className={page==='usage'?'nav-link active':'nav-link'} onClick={()=>setPage('usage')}><BarChart3 size={17}/>Usage</button><button className={page==='api-test'?'nav-link active':'nav-link'} onClick={()=>setPage('api-test')}><Activity size={17}/>API Test</button><button className={page==='docs'?'nav-link active':'nav-link'} onClick={()=>setPage('docs')}><BookOpen size={17}/>Documentation</button><button className={page==='integrations'?'nav-link active':'nav-link'} onClick={()=>setPage('integrations')}><CodeIcon size={17}/>Integrations</button></nav></aside><main className="content">{error&&<div className="error banner">{error}</div>}{page==='keys'?<ApiKeysPage keys={keys} loading={loading} onCreate={()=>setShowCreate(true)} onRevoke={revoke} onRotate={rotate}/>:page==='usage'?<UsagePage session={session}/>:page==='api-test'?<ApiTestPage/>:page==='docs'?<DocumentationPage/>:<IntegrationsPage/>}<p className="security-note"><ShieldCheck size={16}/> API keys are shown in full only once when created or rotated. Store them securely.</p></main>{(showCreate||secret)&&<div className="modal-backdrop"><div className="modal">{secret?<><h2>API key created</h2><p className="muted">Copy this key now. It will not be shown again.</p><div className="secret"><code>{secret}</code><button onClick={copy}>{copied?<Check size={17}/>:<Copy size={17}/>}</button></div><div className="warning">Treat this key like a password. Never commit it to source control.</div><button className="primary full" onClick={()=>setSecret('')}>Done</button></>:<><h2>Create API key</h2><label>Key name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Production integration" autoFocus maxLength={100}/></label><div className="modal-actions"><button className="secondary" onClick={()=>setShowCreate(false)}>Cancel</button><button className="primary" onClick={create} disabled={!name.trim()}>Create key</button></div></>}</div></div>}</div>
}

function ApiKeysPage({keys,loading,onCreate,onRevoke,onRotate}:{keys:ApiKey[];loading:boolean;onCreate:()=>void;onRevoke:(id:string)=>void;onRotate:(id:string)=>void}){
 return <><div className="page-head"><div><div className="eyebrow">Developer</div><h1>API Keys</h1><p className="muted">Create and manage credentials for <code>api.thangdc.com</code>.</p></div><button className="primary" onClick={onCreate}><Plus size={17}/>Create API key</button></div>{loading?<div className="empty">Loading API keys…</div>:keys.length===0?<div className="empty"><ShieldCheck size={30}/><h2>No API keys yet</h2><p>Create your first key to start integrating.</p><button className="primary" onClick={onCreate}><Plus size={17}/>Create API key</button></div>:<div className="table-card"><table><thead><tr><th>Name</th><th>Key</th><th>Status</th><th>Created</th><th>Last used</th><th></th></tr></thead><tbody>{keys.map(k=><tr key={k.id}><td><strong>{k.name}</strong><small>{k.rate_limit_per_minute} requests/min</small></td><td><code>{k.key_masked}</code></td><td><span className={`status ${k.status}`}>{k.status}</span></td><td>{new Date(k.created_at).toLocaleDateString()}</td><td>{k.last_used_at?new Date(k.last_used_at).toLocaleDateString():'Never'}</td><td className="actions">{k.status==='active'&&<><button title="Rotate" onClick={()=>onRotate(k.id)}><RotateCw size={16}/></button><button title="Revoke" onClick={()=>onRevoke(k.id)}><Trash2 size={16}/></button></>}</td></tr>)}</tbody></table></div>}
 </>;
}


function ApiTestPage(){
 const [apiKey,setApiKey]=useState(''),[payload,setPayload]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<{status:number;duration:number;body:string;limit:string;remaining:string;retryAfter:string|null}|null>(null);
 async function send(){
  if(!apiKey.trim()||!payload.trim())return;
  setBusy(true);setError('');setResult(null);
  const started=performance.now();
  try{
   const res=await fetch('https://api.thangdc.com/v1/scan',{method:'POST',headers:{Authorization:`Bearer ${apiKey.trim()}`,'Content-Type':'application/json'},body:JSON.stringify({payload:payload.trim()})});
   const duration=Math.round(performance.now()-started);
   const text=await res.text();
   let body=text;
   try{body=JSON.stringify(JSON.parse(text),null,2)}catch{}
   setResult({status:res.status,duration,body,limit:res.headers.get('X-RateLimit-Limit')??'—',remaining:res.headers.get('X-RateLimit-Remaining')??'—',retryAfter:res.headers.get('Retry-After')});
  }catch(e){setError(e instanceof Error?e.message:'Request failed')}finally{setBusy(false)}
 }
 async function copyCurl(){
  const command=`curl -X POST https://api.thangdc.com/v1/scan -H "Authorization: Bearer ${apiKey.trim()}" -H "Content-Type: application/json" -d '${JSON.stringify({payload:payload.trim()}).replace(/'/g,"'\\''")}'`;
  await navigator.clipboard.writeText(command);
 }
 return <div><div className="page-head"><div><div className="eyebrow">Developer</div><h1>API Test</h1><p className="muted">Test the public QR Tools API without leaving the Developer Portal.</p></div><button className="secondary" onClick={copyCurl} disabled={!apiKey.trim()||!payload.trim()}>Copy cURL</button></div><section className="api-test-card"><label>API key<input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Paste your API key" autoComplete="off"/></label><label>QR payload<textarea value={payload} onChange={e=>setPayload(e.target.value)} placeholder="qrtools:..." rows={7}/></label><button className="primary" onClick={send} disabled={busy||!apiKey.trim()||!payload.trim()}>{busy?'Sending…':'Send request'}</button></section>{error&&<div className="error banner">{error}</div>}{result&&<section className="api-test-result"><div className="api-result-metrics"><div><span>Status</span><strong className={result.status>=400?'result-error':'result-success'}>{result.status}</strong></div><div><span>Response time</span><strong>{result.duration} ms</strong></div><div><span>Rate limit</span><strong>{result.remaining} / {result.limit}</strong></div>{result.retryAfter&&<div><span>Retry after</span><strong>{result.retryAfter}s</strong></div>}</div><pre>{result.body}</pre></section>}</div>;
}

function IntegrationsPage(){
 const [workflow,setWorkflow]=useState('equipment-maintenance');
 const [apiKey,setApiKey]=useState('');
 const [showPreview,setShowPreview]=useState(false);
 const [copied,setCopied]=useState(false);
 const previewRef=React.useRef<HTMLDivElement|null>(null);
 const workflows:Record<string,string>={'equipment-maintenance':'Equipment Maintenance'};
 const embedCode=`<div id="qr-workflow"></div>

<script
  src="https://client.thangdc.com/widget/v1/qr-tools-widget.js"
  data-api-key="YOUR_API_KEY"
  data-workflow="${workflow}"
  data-container="#qr-workflow"
  defer>
</script>`;
 useEffect(()=>{
  if(!showPreview||!apiKey.trim()||!previewRef.current)return;
  let cancelled=false; const container=previewRef.current; container.innerHTML='';
  const script=document.createElement('script');
  script.src='https://client.thangdc.com/widget/v1/qr-tools-widget.js';
  script.dataset.apiKey=apiKey.trim();
  script.dataset.workflow=workflow;
  script.dataset.autoInit='false';
  script.onload=()=>{if(cancelled)return; const widget=(window as Window & {QrToolsWidget?:{mount:(element:HTMLElement,config?:{apiKey:string;workflowId?:string})=>void}}).QrToolsWidget; if(widget)widget.mount(container,{apiKey:apiKey.trim(),workflowId:workflow});};
  script.onerror=()=>{container.innerHTML='<div class="error">Unable to load the QR Tools widget.</div>';};
  document.head.appendChild(script);
  return()=>{cancelled=true;script.remove();container.innerHTML='';};
 },[showPreview,apiKey,workflow]);
 async function copy(){await navigator.clipboard.writeText(embedCode);setCopied(true);setTimeout(()=>setCopied(false),1200)}
 return <div>
  <div className="page-head"><div><div className="eyebrow">Developer</div><h1>Integrations</h1><p className="muted">Run the real QR Tools workflow here, then copy the embed code for your client.</p></div></div>
  <div className="integration-stack">
   <section className="integration-card integration-card--setup">
    <div className="integration-grid">
     <label>Workflow<select value={workflow} onChange={e=>{setWorkflow(e.target.value);setShowPreview(false)}}>{Object.entries(workflows).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
     <label>API key<input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Paste your API key" autoComplete="off"/></label>
    </div>
    <div className="integration-actions"><button className="primary" onClick={()=>setShowPreview(true)} disabled={!apiKey.trim()}>Run integration</button></div>
   </section>
   <section className="integration-card integration-card--live">
    <div className="generated-head"><div><h2>Live Widget</h2><p className="muted">The real browser widget served from <code>client.thangdc.com</code>.</p></div></div>
    <div ref={previewRef} className="integration-preview">{!showPreview&&<div className="empty"><CodeIcon size={30}/><h2>Ready to run</h2><p>Enter an API key above and click Run integration.</p></div>}</div>
   </section>
   <section className="integration-card integration-card--embed">
    <div className="generated-head"><div><h2>Embed code</h2><p className="muted">Use the same workflow and replace <code>YOUR_API_KEY</code> with your API key.</p></div><button className="secondary" onClick={copy}>{copied?<><Check size={15}/>Copied</>:<><Copy size={15}/>Copy code</>}</button></div>
    <pre className="integration-code">{embedCode}</pre>
   </section>
   <section className="docs-card"><h2>How it works</h2><ol><li>Select the workflow and enter an API key.</li><li>Run the real widget in the Live Widget card.</li><li>Complete Input → Generate QR → Camera/Upload → Scan → Result.</li><li>Copy the embed code when ready.</li></ol></section>
  </div>
 </div>;
}
function DocumentationPage(){
 const [copied,setCopied]=useState('');
 const base='https://api.thangdc.com';
 const examples:Record<string,string>={
  curl:`curl -X POST ${base}/v1/scan -H "Authorization: Bearer YOUR_API_KEY" -H "Content-Type: application/json" -d '{"payload":"qrtools:..."}'`,
  javascript:`const response = await fetch('${base}/v1/scan', {
  method: 'POST',
  headers: { Authorization: 'Bearer YOUR_API_KEY', 'Content-Type': 'application/json' },
  body: JSON.stringify({ payload: 'qrtools:...' })
});
const data = await response.json();`,
  python:`import requests

response = requests.post(
    "${base}/v1/scan",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={"payload": "qrtools:..."},
)
print(response.json())`
 };
 async function copy(key:string){await navigator.clipboard.writeText(examples[key]);setCopied(key);setTimeout(()=>setCopied(''),1200)}
 return <div><div className="page-head"><div><div className="eyebrow">Developer</div><h1>Documentation</h1><p className="muted">Integrate your system with the QR Tools Public API.</p></div></div><section className="docs-card"><h2>Authentication</h2><p>Send your API key as a Bearer token on every request.</p><pre>Authorization: Bearer YOUR_API_KEY</pre></section><section className="docs-card"><h2>Scan QR</h2><div className="endpoint"><span>POST</span><code>{base}/v1/scan</code></div><p>Resolve a QR Tools payload into its workflow, record and available actions.</p><h3>Request body</h3><pre>{`{
  "payload": "qrtools:..."
}`}</pre><h3>Response</h3><pre>{`{
  "success": true,
  "identity": { "version": 1, "workflowId": "...", "recordId": "..." },
  "record": { "workflowId": "...", "workflowVersion": 1 },
  "action": { "type": "view", "data": { "recordId": "..." } }
}`}</pre></section><section className="docs-card"><h2>Code examples</h2>{Object.entries(examples).map(([key,value])=><div className="code-example" key={key}><div className="code-head"><strong>{key[0].toUpperCase()+key.slice(1)}</strong><button className="secondary" onClick={()=>copy(key)}>{copied===key?<><Check size={15}/>Copied</>:<><Copy size={15}/>Copy</>}</button></div><pre>{value}</pre></div>)}</section><section className="docs-card"><h2>Rate limits</h2><p>Each API key has its own requests-per-minute limit. Responses expose these headers:</p><ul><li><code>X-RateLimit-Limit</code> — configured limit</li><li><code>X-RateLimit-Remaining</code> — requests remaining in the current window</li><li><code>Retry-After</code> — seconds to wait after a 429 response</li></ul></section></div>;
}
function UsagePage({session}:{session:DeveloperSession}){
 const [data,setData]=useState<UsageData|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[range,setRange]=useState<'today'|'last7Days'|'last30Days'>('today');
 async function refresh(){setLoading(true);setError('');try{setData(await getUsage(session))}catch(e){setError(e instanceof Error?e.message:'Unable to load usage')}finally{setLoading(false)}}
 useEffect(()=>{void refresh()},[]);
 if(loading)return <div><div className="page-head"><div><div className="eyebrow">Developer</div><h1>Usage</h1><p className="muted">API request telemetry for your developer account.</p></div></div><div className="empty">Loading usage…</div></div>;
 if(error)return <div><div className="page-head"><div><div className="eyebrow">Developer</div><h1>Usage</h1></div></div><div className="error banner">{error}</div></div>;
 if(!data)return null;
 const period=data.summary[range];
 return <div><div className="page-head"><div><div className="eyebrow">Developer</div><h1>Usage</h1><p className="muted">API request telemetry for your developer account.</p></div><button className="secondary" onClick={refresh}>Refresh</button></div><div className="range-tabs">{(['today','last7Days','last30Days'] as const).map(value=><button key={value} className={range===value?'active':''} onClick={()=>setRange(value)}>{value==='today'?'Today':value==='last7Days'?'Last 7 days':'Last 30 days'}</button>)}</div><div className="metric-grid"><Metric label="Requests" value={period.requests}/><Metric label="Successful" value={period.successful}/><Metric label="4xx errors" value={period.errors4xx}/><Metric label="5xx errors" value={period.errors5xx}/></div><section className="usage-section"><div className="section-head"><div><h2>Rate-limit status</h2><p className="muted">Requests observed in the last 60 seconds.</p></div></div><div className="table-card"><table><thead><tr><th>API key</th><th>Status</th><th>Last minute</th><th>Limit</th><th>Remaining</th><th>Last used</th></tr></thead><tbody>{data.keyUsage.length===0?<tr><td colSpan={6}>No API keys yet.</td></tr>:data.keyUsage.map(key=>{const remaining=Math.max(0,key.rateLimitPerMinute-key.currentMinuteRequests);return <tr key={key.id}><td><strong>{key.name}</strong></td><td><span className={`status ${key.status}`}>{key.status}</span></td><td>{key.currentMinuteRequests}</td><td>{key.rateLimitPerMinute}</td><td>{remaining}</td><td>{key.lastUsedAt?new Date(key.lastUsedAt).toLocaleString():'Never'}</td></tr>})}</tbody></table></div></section><div className="usage-columns"><section className="usage-section"><div className="section-head"><div><h2>Endpoint usage</h2><p className="muted">Last 30 days.</p></div></div><div className="table-card"><table><thead><tr><th>Endpoint</th><th>Requests</th><th>Success</th><th>4xx</th><th>5xx</th></tr></thead><tbody>{data.endpointUsage.length===0?<tr><td colSpan={5}>No API requests yet.</td></tr>:data.endpointUsage.map(item=><tr key={item.endpoint}><td><code>{item.endpoint}</code></td><td>{item.requests}</td><td>{item.successful}</td><td>{item.errors4xx}</td><td>{item.errors5xx}</td></tr>)}</tbody></table></div></section><section className="usage-section status-codes"><div className="section-head"><div><h2>Status codes</h2><p className="muted">Last 30 days.</p></div></div><div className="table-card"><table><thead><tr><th>Status</th><th>Requests</th></tr></thead><tbody>{data.statusBreakdown.length===0?<tr><td colSpan={2}>No API requests yet.</td></tr>:data.statusBreakdown.map(item=><tr key={item.statusCode}><td><code>{item.statusCode}</code></td><td>{item.requests}</td></tr>)}</tbody></table></div></section></div><p className="latest-usage">Latest request: {data.latestRequestAt?new Date(data.latestRequestAt).toLocaleString():'None yet'}</p></div>;
}

function Metric({label,value}:{label:string;value:number}){return <div className="metric-card"><span>{label}</span><strong>{value.toLocaleString()}</strong></div>}
export default App;
