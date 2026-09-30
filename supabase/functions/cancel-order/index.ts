import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@^1";

function json(data: Record<string, unknown>, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function orderCodeOf(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

Deno.serve(
  withSupabase({ auth: ["publishable"] }, async (req, ctx) => {
    if (req.method !== "POST") {
      return json({ success: false, message: "Method Not Allowed." }, 405);
    }

    const body = await req.json().catch(() => ({}));
    const orderCode = orderCodeOf(body.orderCode);
    if (!orderCode) {
      return json({ success: false, message: "Mã đơn hàng là bắt buộc." }, 400);
    }

    const { data: order, error } = await ctx.supabaseAdmin
      .from("orders")
      .select("id,status")
      .eq("order_code", orderCode)
      .maybeSingle();

    if (error) {
      console.error("Order lookup failed:", error);
      return json({ success: false, message: "Không thể cập nhật đơn hàng." }, 500);
    }

    if (!order) {
      return json({ success: false, message: "Không tìm thấy đơn hàng." }, 404);
    }

    if (order.status === "paid") return json({ success: true, status: "paid" });
    if (order.status !== "pending") return json({ success: true, status: order.status });

    const { error: updateError } = await ctx.supabaseAdmin
      .from("orders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .eq("status", "pending");

    if (updateError) {
      console.error("Order cancellation failed:", updateError);
      return json({ success: false, message: "Không thể hủy đơn hàng." }, 500);
    }

    return json({ success: true, status: "cancelled" });
  }),
);
