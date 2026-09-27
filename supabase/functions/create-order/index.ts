import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const PLANS = {
  monthly: { amount: 59000, days: 31 },
  yearly: { amount: 499000, days: 365 },
} as const;

function json(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function randomCode() {
  return "QT" + crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
}

async function signFields(fields: Record<string, string>, secret: string) {
  const allowed = [
    "order_amount", "merchant", "currency", "operation", "order_description",
    "order_invoice_number", "customer_id", "payment_method",
    "success_url", "error_url", "cancel_url",
  ];
  const signed = allowed
    .filter((field) => fields[field] !== undefined && fields[field] !== "")
    .map((field) => `${field}=${fields[field]}`)
    .join(",");
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

Deno.serve(withSupabase({ auth: ["publishable"] }, async (req, ctx) => {
  if (req.method !== "POST") return json({ success: false, message: "Method Not Allowed." }, 405);

  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const plan = String(body.plan ?? "monthly") as keyof typeof PLANS;

  if (!validEmail(email)) return json({ success: false, message: "Email không hợp lệ." }, 400);
  if (!(plan in PLANS)) return json({ success: false, message: "Gói Pro không hợp lệ." }, 400);

  const merchantId = Deno.env.get("SEPAY_MERCHANT_ID") || "";
  const secretKey = Deno.env.get("SEPAY_SECRET_KEY") || "";
  const environment = (Deno.env.get("SEPAY_ENVIRONMENT") || "sandbox").toLowerCase();
  if (!merchantId || !secretKey) return json({ success: false, message: "Thanh toán SePay chưa được cấu hình." }, 503);

  const orderCode = randomCode();
  const config = PLANS[plan];
  const successUrl = Deno.env.get("SEPAY_SUCCESS_URL") || "https://qr.thangdc.com/?payment=success";
  const errorUrl = Deno.env.get("SEPAY_ERROR_URL") || "https://qr.thangdc.com/?payment=error";
  const cancelUrl = Deno.env.get("SEPAY_CANCEL_URL") || "https://qr.thangdc.com/?payment=cancel";
  const fields: Record<string, string> = {
    order_amount: String(config.amount),
    merchant: merchantId,
    currency: "VND",
    operation: "PURCHASE",
    order_description: `QR Tools Pro ${plan} - ${orderCode}`,
    order_invoice_number: orderCode,
    payment_method: "BANK_TRANSFER",
    success_url: successUrl,
    error_url: errorUrl,
    cancel_url: cancelUrl,
  };
  fields.signature = await signFields(fields, secretKey);

  const { error } = await ctx.supabaseAdmin.from("orders").insert({
    order_code: orderCode,
    product_code: "vietsoft-qr",
    plan,
    amount: config.amount,
    currency: "VND",
    email,
    status: "pending",
    payment_method: "sepay_gateway",
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    metadata: { planDays: config.days, sepayEnvironment: environment },
  });

  if (error) {
    console.error("Order insert failed:", error);
    return json({ success: false, message: "Không thể tạo đơn hàng." }, 500);
  }

  const checkoutEndpoint = environment === "production"
    ? "https://pay.sepay.vn/v1/checkout/init"
    : "https://pay-sandbox.sepay.vn/v1/checkout/init";

  return json({
    success: true,
    orderCode,
    amount: config.amount,
    plan,
    checkoutEndpoint,
    checkoutFields: fields,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
}));
