import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(data: Record<string, unknown>, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ success: false, message: "Method Not Allowed." }, 405);
  }

  const secret = Deno.env.get("SEPAY_SECRET_KEY") || "";
  if (!secret || req.headers.get("X-Secret-Key") !== secret) {
    return json({ success: false, message: "Unauthorized." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase service credentials are not configured.");
    return json({ success: false, message: "Server configuration error." }, 500);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const data = await req.json().catch(() => null) as Record<string, any> | null;
  if (!data) {
    return json({ success: false, message: "Invalid JSON." }, 400);
  }

  if (data.notification_type !== "ORDER_PAID") {
    return json({ success: true });
  }

  const order = data.order || {};
  const tx = data.transaction || {};
  const orderCode = String(order.order_invoice_number || "").trim().toUpperCase();
  const transactionId = String(tx.transaction_id || tx.id || "").trim();
  const amount = Math.round(Number(tx.transaction_amount || order.order_amount || 0));

  if (!orderCode || !transactionId || !Number.isFinite(amount) || amount <= 0) {
    return json({ success: false, message: "Invalid payment payload." }, 400);
  }

  const { data: completed, error } = await supabaseAdmin.rpc("complete_qr_tools_order", {
    p_order_code: orderCode,
    p_transaction_id: transactionId,
    p_transaction_amount: amount,
    p_payment_method: String(tx.payment_method || "sepay_gateway"),
    p_payment_reference: String(tx.transaction_id || tx.id || ""),
  });

  if (error) {
    console.error("Order completion failed:", {
      orderCode,
      transactionId,
      message: error.message,
      code: error.code,
    });
    return json({ success: false, message: "Order completion failed." }, 500);
  }

  return json({ success: true, completed: completed ?? [] });
});
