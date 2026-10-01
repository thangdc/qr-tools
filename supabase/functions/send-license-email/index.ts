import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@^1";

const APP_URL = "https://qr.thangdc.com/";
const DEFAULT_FROM = "QR Tools <noreply@qr.thangdc.com>";

function json(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function money(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? new Intl.NumberFormat("vi-VN").format(amount) + " ₫" : "";
}
function date(value: unknown) {
  if (!value) return "";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "medium", timeStyle: "short" }).format(parsed);
}
function plan(value: unknown) {
  return String(value ?? "").toLowerCase() === "yearly" ? "Pro Yearly" : "Pro Monthly";
}
function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

Deno.serve(withSupabase({ auth: ["secret"] }, async (req, ctx) => {
  if (req.method !== "POST") return json({ success: false, message: "Method Not Allowed." }, 405);
  const body = await req.json().catch(() => ({}));
  const orderCode = String(body.orderCode ?? "").trim().toUpperCase();
  if (!orderCode) return json({ success: false, message: "orderCode is required." }, 400);

  const { data: order, error } = await ctx.supabaseAdmin.from("orders").select(
    "id,order_code,plan,amount,email,status,payment_method,payment_reference,paid_at,metadata,license_email_sent_at,license_email_id"
  ).eq("order_code", orderCode).maybeSingle();
  if (error) return json({ success: false, message: "Could not load order." }, 500);
  if (!order) return json({ success: false, message: "Order not found." }, 404);
  if (order.status !== "paid") return json({ success: false, message: "Order is not paid." }, 409);
  if (order.license_email_sent_at && order.license_email_id) return json({ success: true, alreadySent: true, emailId: order.license_email_id });

  const metadata = order.metadata && typeof order.metadata === "object" ? order.metadata as Record<string, unknown> : {};
  const licenseKey = String(metadata.licenseKey ?? "").trim();
  const expiresAt = String(metadata.licenseExpiresAt ?? "").trim();
  const invoiceNumber = String(metadata.invoiceNumber ?? "").trim();
  if (!licenseKey || !expiresAt) return json({ success: false, message: "Paid order is missing license data." }, 409);
  if (!order.email) return json({ success: false, message: "Order email is missing." }, 409);

  const apiKey = Deno.env.get("RESEND_API_KEY") || "";
  if (!apiKey) return json({ success: false, message: "Email service is not configured." }, 500);
  const from = Deno.env.get("RESEND_FROM_EMAIL") || DEFAULT_FROM;
  const subject = "QR Tools Pro – License Key & xác nhận thanh toán";
  const html = `<h1>Thanh toán QR Tools Pro thành công</h1><p>License Key: <strong>${escapeHtml(licenseKey)}</strong></p><p>Gói: ${escapeHtml(plan(order.plan))}</p><p>Hiệu lực đến: ${escapeHtml(date(expiresAt))}</p><p>Mã đơn hàng: ${escapeHtml(order.order_code)}</p><p>Mã hóa đơn: ${escapeHtml(invoiceNumber)}</p><p>Số tiền: ${escapeHtml(money(order.amount))}</p><p>Mã giao dịch: ${escapeHtml(order.payment_reference || "")}</p><p><a href="${APP_URL}">Mở QR Tools</a></p>`;
  const text = `Thanh toán QR Tools Pro thành công\n\nLicense Key: ${licenseKey}\nGói: ${plan(order.plan)}\nHiệu lực đến: ${date(expiresAt)}\nMã đơn hàng: ${order.order_code}\nMã hóa đơn: ${invoiceNumber}\nSố tiền: ${money(order.amount)}\nMã giao dịch: ${order.payment_reference || ""}\nMở QR Tools: ${APP_URL}`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json", "Idempotency-Key": "license-delivery/" + order.id },
      body: JSON.stringify({ from, to: [order.email], subject, html, text }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Resend ${response.status}: ${JSON.stringify(result)}`);
    const emailId = String(result.id ?? "");
    await ctx.supabaseAdmin.from("orders").update({ license_email_sent_at: new Date().toISOString(), license_email_id: emailId || null, license_email_error: null, updated_at: new Date().toISOString() }).eq("id", order.id);
    return json({ success: true, alreadySent: false, emailId });
  } catch (sendError) {
    const message = sendError instanceof Error ? sendError.message : String(sendError);
    await ctx.supabaseAdmin.from("orders").update({ license_email_error: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("id", order.id);
    console.error("License email failed:", message);
    return json({ success: false, message: "Email delivery failed." }, 502);
  }
}));
