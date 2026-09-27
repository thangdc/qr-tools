import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@^1";
const PLANS={monthly:{amount:59000,days:31},yearly:{amount:499000,days:365}} as const;
function json(data:Record<string,unknown>,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store"}})}
function emailOf(v:unknown){return String(v??"").trim().toLowerCase()}
function validEmail(v:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function code(){return "QT"+crypto.randomUUID().replace(/-/g,"").slice(0,10).toUpperCase()}
async function signFields(f:Record<string,string>,secret:string){
 const allowed=["order_amount","merchant","currency","operation","order_description","order_invoice_number","customer_id","payment_method","success_url","error_url","cancel_url"];
 const signed=allowed.filter(k=>f[k]!==undefined&&f[k]!=="").map(k=>`${k}=${f[k]}`).join(",");
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const digest=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(signed));let b="";for(const x of new Uint8Array(digest))b+=String.fromCharCode(x);return btoa(b);
}
Deno.serve(withSupabase({auth:["publishable"]},async(req,ctx)=>{
 if(req.method!=="POST")return json({success:false,message:"Method Not Allowed."},405);
 const body=await req.json().catch(()=>({}));const email=emailOf(body.email);const plan=String(body.plan??"monthly") as keyof typeof PLANS;
 if(!validEmail(email))return json({success:false,message:"Email không hợp lệ."},400);
 if(!(plan in PLANS))return json({success:false,message:"Gói Pro không hợp lệ."},400);
 const merchantId=Deno.env.get("SEPAY_MERCHANT_ID")||"";const secret=Deno.env.get("SEPAY_SECRET_KEY")||"";const env=(Deno.env.get("SEPAY_ENVIRONMENT")||"sandbox").toLowerCase();
 if(!merchantId||!secret)return json({success:false,message:"Thanh toán SePay chưa được cấu hình."},503);
 const orderCode=code(),cfg=PLANS[plan],expiresAt=new Date(Date.now()+30*60*1000).toISOString();
 const fields:Record<string,string>={order_amount:String(cfg.amount),merchant:merchantId,currency:"VND",operation:"PURCHASE",order_description:`QR Tools Pro ${plan} - ${orderCode}`,order_invoice_number:orderCode,payment_method:"BANK_TRANSFER",success_url:Deno.env.get("SEPAY_SUCCESS_URL")||`https://qr.thangdc.com/?payment=success&order=${orderCode}`,error_url:Deno.env.get("SEPAY_ERROR_URL")||`https://qr.thangdc.com/?payment=error&order=${orderCode}`,cancel_url:Deno.env.get("SEPAY_CANCEL_URL")||`https://qr.thangdc.com/?payment=cancel&order=${orderCode}`};
 fields.signature=await signFields(fields,secret);
 const {error}=await ctx.supabaseAdmin.from("orders").insert({order_code:orderCode,product_code:"vietsoft-qr",plan,amount:cfg.amount,currency:"VND",email,status:"pending",payment_method:"sepay_gateway",expires_at:expiresAt,metadata:{planDays:cfg.days,sepayEnvironment:env}});
 if(error){console.error("Order insert failed:",error);return json({success:false,message:"Không thể tạo đơn hàng."},500)}
 return json({success:true,orderCode,amount:cfg.amount,plan,checkoutEndpoint:env==="production"?"https://pay.sepay.vn/v1/checkout/init":"https://pay-sandbox.sepay.vn/v1/checkout/init",checkoutFields:fields,expiresAt});
}));