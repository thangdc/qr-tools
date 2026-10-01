import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@^1";

function json(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Content-Type": "application/json" } });
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}

async function verifySignature(body: string, signature: string, timestamp: string, secret: string) {
  const ts = Number(timestamp);
  if (!secret || !signature || !Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ts + "." + body)));
  const expected = "sha256=" + Array.from(digest).map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(new TextEncoder().encode(expected), new TextEncoder().encode(signature));
}

async function sendLicenseEmail(orderCode: string) {
  const url = (Deno.env.get("SUPABASE_URL") || "") + "/functions/v1/send-license-email";
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const key = keys.default || "";
  if (!key) {
    console.error("Supabase secret key unavailable for email dispatch.");
    return;
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ orderCode }),
    });
    if (!response.ok) console.error("License email dispatch failed:", response.status, await response.text());
  } catch (error) {
    console.error("License email dispatch error:", error);
  }
}

Deno.serve(withSupabase({ auth: [] }, async (req, ctx) => {
  if (req.method !== "POST") return json({ success: false, message: "Method Not Allowed." }, 405);

  const bodyText = await req.text();
  const signature = req.headers.get("X-SePay-Signature") || "";
  const timestamp = req.headers.get("X-SePay-Timestamp") || "";
  const secret = Deno.env.get("SEPAY_WEBHOOK_SECRET") || "";
  if (!(await verifySignature(bodyText, signature, timestamp, secret))) return json({ success: false, message: "Invalid signature." }, 401);

  const data = JSON.parse(bodyText);
  const transactionId = String(data.id ?? "");
  const transferType = String(data.transferType ?? "");
  const amount = Number(data.transferAmount ?? 0);
  const code = String(data.code ?? "").trim().toUpperCase();
  if (!transactionId || transferType !== "in" || !Number.isFinite(amount) || amount <= 0) return json({ success: true });

  const { data: existing } = await ctx.supabaseAdmin.from("payment_transactions").select("id")
    .eq("provider", "sepay").eq("provider_transaction_id", transactionId).maybeSingle();
  if (existing) {
    if (code) await sendLicenseEmail(code);
    return json({ success: true });
  }

  const { data: transaction, error: transactionError } = await ctx.supabaseAdmin.from("payment_transactions").insert({
    provider: "sepay", provider_transaction_id: transactionId, order_code: code || "UNMATCHED",
    amount, transfer_type: transferType, content: String(data.content ?? ""), raw_payload: data,
  }).select("id").maybeSingle();

  if (transactionError) {
    const { data: duplicate } = await ctx.supabaseAdmin.from("payment_transactions").select("id")
      .eq("provider", "sepay").eq("provider_transaction_id", transactionId).maybeSingle();
    if (duplicate) {
      if (code) await sendLicenseEmail(code);
      return json({ success: true });
    }
    console.error("Transaction insert failed:", transactionError);
    return json({ success: false, message: "Database error." }, 500);
  }
  if (!transaction || !code) return json({ success: true });

  const { data: order } = await ctx.supabaseAdmin.from("orders")
    .select("id,order_code,amount,status").eq("order_code", code).maybeSingle();

  if (!order || order.status !== "pending") {
    if (order?.status === "paid") await sendLicenseEmail(code);
    return json({ success: true });
  }

  const { data: completed, error: completionError } = await ctx.supabaseAdmin.rpc("complete_qr_tools_order", {
    p_order_code: code,
    p_transaction_id: transactionId,
    p_transaction_amount: amount,
    p_payment_method: "sepay",
    p_payment_reference: String(data.referenceCode ?? transactionId),
  });
  if (completionError) {
    console.error("Order completion failed:", completionError);
    return json({ success: false, message: "Order completion failed." }, 500);
  }

  await sendLicenseEmail(code);
  return json({ success: true, completed: completed ?? [] });
}));
