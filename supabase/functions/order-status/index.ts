import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@^1";

function json(data: Record<string, unknown>, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function emailOf(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
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
    const email = emailOf(body.email);
    const orderCode = orderCodeOf(body.orderCode);

    if (!email || !orderCode) {
      return json({ success: false, message: "Email và mã đơn hàng là bắt buộc." }, 400);
    }

    const { data: order, error } = await ctx.supabaseAdmin
      .from("orders")
      .select("order_code,email,status,expires_at,metadata")
      .eq("order_code", orderCode)
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Order lookup failed:", error);
      return json({ success: false, message: "Không thể kiểm tra đơn hàng." }, 500);
    }

    if (!order) {
      return json({ success: false, message: "Không tìm thấy đơn hàng." }, 404);
    }

    let status = order.status as "pending" | "paid" | "cancelled" | "expired";

    if (
      status === "pending" &&
      order.expires_at &&
      new Date(order.expires_at).getTime() <= Date.now()
    ) {
      status = "expired";
      await ctx.supabaseAdmin
        .from("orders")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("order_code", orderCode)
        .eq("status", "pending");
    }

    const metadata =
      order.metadata && typeof order.metadata === "object"
        ? (order.metadata as Record<string, unknown>)
        : {};

    return json({
      success: true,
      status,
      ...(status === "paid" && typeof metadata.licenseKey === "string"
        ? { licenseKey: metadata.licenseKey }
        : {}),
      ...(status === "paid" && typeof metadata.licenseExpiresAt === "string"
        ? { expiresAt: metadata.licenseExpiresAt }
        : {}),
    });
  }),
);
