import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

function json(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(withSupabase({ auth: [] }, async (req, ctx) => {
  if (req.method !== "POST") return json({ success: false, message: "Method Not Allowed." }, 405);

  const secret = Deno.env.get("SEPAY_SECRET_KEY") || "";
  if (!secret || req.headers.get("X-Secret-Key") !== secret) {
    return json({ success: false, message: "Unauthorized." }, 401);
  }

  const data = await req.json().catch(() => null) as Record<string, any> | null;
  if (!data) return json({ success: false, message: "Invalid JSON." }, 400);

  if (data.notification_type === "TRANSACTION_VOID") {
    return json({ success: true });
  }

  if (data.notification_type !== "ORDER_PAID") {
    return json({ success: true });
  }

  const order = data.order || {};
  const transaction = data.transaction || {};
  const orderCode = String(order.order_invoice_number || "").trim().toUpperCase();
  const transactionId = String(transaction.transaction_id || transaction.id || "").trim();
  const amount = Math.round(Number(transaction.transaction_amount || order.order_amount || 0));

  if (!orderCode || !transactionId || !Number.isFinite(amount) || amount <= 0) {
    return json({ success: false, message: "Invalid payment payload." }, 400);
  }

  try {
    const { data: completed, error } = await ctx.supabaseAdmin.rpc("complete_qr_tools_order", {
      p_order_code: orderCode,
      p_transaction_id: transactionId,
      p_transaction_amount: amount,
      p_payment_method: String(transaction.payment_method || "sepay_gateway"),
      p_payment_reference: String(transaction.transaction_id || transaction.id || ""),
    });

    if (error) {
      console.error("Order completion failed:", error);
      return json({ success: false, message: "Order completion failed." }, 500);
    }

    return json({ success: true, completed: completed ?? [] });
  } catch (error) {
    console.error("IPN processing failed:", error);
    return json({ success: false, message: "IPN processing failed." }, 500);
  }
}));
