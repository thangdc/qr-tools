import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const PRODUCT = "vietsoft-qr";

function json(data: Record<string, unknown>, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isExpired(value: string | null): boolean {
  if (!value) return false;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T23:59:59.999Z`
    : value;
  return new Date(normalized).getTime() < Date.now();
}

function publicExpiresAt(value: string | null): string {
  return value ?? "";
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    if (req.method !== "POST") return json({ success: false, message: "Method Not Allowed." }, 405);

    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    const deviceId = String(body.deviceId ?? "").trim();
    const activationToken = String(body.activationToken ?? "").trim();
    const licenseKey = String(body.licenseKey ?? "").trim();

    if (!email || !deviceId || (!activationToken && !licenseKey)) {
      return json({ success: false, message: "Email, Device ID và Activation Token hoặc License Key là bắt buộc." }, 400);
    }

    const activationTokenHash = activationToken ? await sha256(activationToken) : "";
    let activation: { id: string; license_id: string; device_id: string; deactivated_at: string | null } | null = null;
    let license: { id: string; email: string; product_id: string } | null = null;

    if (activationTokenHash) {
      const { data: tokenActivation, error: activationError } = await ctx.supabaseAdmin
        .from("activations")
        .select("id, license_id, device_id, deactivated_at")
        .eq("activation_token_hash", activationTokenHash)
        .maybeSingle();

      if (!activationError && tokenActivation) {
        activation = tokenActivation;
      }
    }

    // Activation tokens are device-local and can become stale when the same
    // device is re-activated, for example from another browser tab.
    // Allow the license owner to remove the current device with the License Key.
    if (!activation && licenseKey) {
      const licenseKeyHash = await sha256(licenseKey);
      const { data: keyLicense, error: keyLicenseError } = await ctx.supabaseAdmin
        .from("licenses")
        .select("id, email, product_id")
        .eq("license_key_hash", licenseKeyHash)
        .maybeSingle();

      if (!keyLicenseError && keyLicense) {
        const { data: deviceActivation, error: deviceActivationError } = await ctx.supabaseAdmin
          .from("activations")
          .select("id, license_id, device_id, deactivated_at")
          .eq("license_id", keyLicense.id)
          .eq("device_id", deviceId)
          .is("deactivated_at", null)
          .order("activated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!deviceActivationError && deviceActivation) {
          activation = deviceActivation;
          license = keyLicense;
        }
      }
    }

    if (!activation) {
      return json({ success: false, message: "Activation Token không hợp lệ." }, 403);
    }

    if (activation.device_id !== deviceId || activation.deactivated_at) {
      return json({ success: false, message: "Thiết bị chưa được kích hoạt." }, 403);
    }

    if (!license) {
      const { data: activationLicense, error: licenseError } = await ctx.supabaseAdmin
        .from("licenses")
        .select("id, email, product_id")
        .eq("id", activation.license_id)
        .maybeSingle();

      if (licenseError || !activationLicense) {
        return json({ success: false, message: "License không tồn tại." }, 403);
      }
      license = activationLicense;
    }

    const { data: product, error: productError } = await ctx.supabaseAdmin
      .from("products")
      .select("code")
      .eq("id", license.product_id)
      .maybeSingle();

    if (productError || !product || product.code !== PRODUCT) {
      return json({ success: false, message: "License không dành cho VietSoft QR Code Generator." }, 403);
    }

    if (normalizeEmail(license.email) !== email) {
      return json({ success: false, message: "Email không khớp với License." }, 403);
    }

    const { error: updateError } = await ctx.supabaseAdmin
      .from("activations")
      .update({ deactivated_at: new Date().toISOString() })
      .eq("id", activation.id);

    if (updateError) {
      console.error("Deactivation failed:", updateError);
      return json({ success: false, message: "Không thể xóa kích hoạt." }, 500);
    }

    const { count: activeDevices } = await ctx.supabaseAdmin.from("activations").select("id", { count: "exact", head: true }).eq("license_id", license.id).is("deactivated_at", null);
    return json({ success: true, activeDevices: activeDevices ?? 0 });
  }),
};
