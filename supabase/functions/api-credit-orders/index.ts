import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const PACKS = {
  starter: { amount: 29000, credits: 10000, label: "Starter" },
  growth: { amount: 99000, credits: 50000, label: "Growth" },
  business: { amount: 299000, credits: 200000, label: "Business" },
} as const;

function json(data: Record<string, unknown>, status = 200, origin: string | null = null) {
  const allowed = new Set(["https://client.thangdc.com", "http://localhost:5173", "http://localhost:3000"]);
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin && allowed.has(origin) ? origin : "https://client.thangdc.com",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Vary": "Origin",
    },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return json({ success: true }, 200, origin);
  if (!["GET", "POST"].includes(req.method)) return json({ error: "method_not_allowed" }, 405, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: "server_not_configured" }, 500, origin);

  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401, origin);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;
  if (userError || !user) return json({ error: "unauthorized" }, 401, origin);

  if (req.method === "GET") {
    const orderCode = new URL(req.url).searchParams.get("orderCode");
    const { data: wallet, error: walletError } = await admin.from("api_credit_wallets")
      .select("credits_balance,updated_at").eq("user_id", user.id).maybeSingle();
    if (walletError) return json({ error: "wallet_lookup_failed" }, 500, origin);

    if (orderCode) {
      const { data: purchase, error } = await admin.from("api_credit_purchases")
        .select("order_code,pack_code,credits,amount,status,created_at,paid_at")
        .eq("order_code", orderCode).eq("user_id", user.id).maybeSingle();
      if (error) return json({ error: "purchase_lookup_failed" }, 500, origin);
      if (!purchase) return json({ error: "order_not_found" }, 404, origin);
      return json({ success: true, balance: wallet?.credits_balance ?? 0, purchase }, 200, origin);
    }

    const { data: purchases, error } = await admin.from("api_credit_purchases")
      .select("order_code,pack_code,credits,amount,status,created_at,paid_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
    if (error) return json({ error: "purchase_history_failed" }, 500, origin);
    return json({ success: true, balance: wallet?.credits_balance ?? 0, purchases: purchases ?? [] }, 200, origin);
  }

  const body = await req.json().catch(() => ({}));
  const packCode = String(body.pack || "") as keyof typeof PACKS;
  if (!(packCode in PACKS)) return json({ error: "invalid_pack" }, 400, origin);

  const bankCode = Deno.env.get("SEPAY_BANK_CODE") || "";
  const bankAccount = Deno.env.get("SEPAY_BANK_ACCOUNT") || "";
  const bankAccountName = Deno.env.get("SEPAY_BANK_ACCOUNT_NAME") || "";
  if (!bankCode || !bankAccount) return json({ error: "sepay_bank_transfer_not_configured" }, 503, origin);

  const pack = PACKS[packCode];
  const orderCode = "QRC" + crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const { error: orderError } = await admin.from("orders").insert({
    order_code: orderCode,
    product_code: "qr-tools-api-credits",
    plan: packCode,
    amount: pack.amount,
    currency: "VND",
    email: (user.email || "").toLowerCase(),
    status: "pending",
    payment_method: "sepay",
    expires_at: expiresAt,
    metadata: { credits: pack.credits, userId: user.id, pack: packCode },
  });
  if (orderError) {
    console.error("API credit order insert failed", orderError);
    return json({ error: "order_create_failed" }, 500, origin);
  }

  const { error: purchaseError } = await admin.from("api_credit_purchases").insert({
    order_code: orderCode,
    user_id: user.id,
    pack_code: packCode,
    credits: pack.credits,
    amount: pack.amount,
    status: "pending",
  });
  if (purchaseError) {
    console.error("API credit purchase insert failed", purchaseError);
    await admin.from("orders").update({ status: "cancelled" }).eq("order_code", orderCode);
    return json({ error: "purchase_create_failed" }, 500, origin);
  }

  const qr = new URL("https://qr.sepay.vn/img");
  qr.searchParams.set("acc", bankAccount);
  qr.searchParams.set("bank", bankCode);
  qr.searchParams.set("amount", String(pack.amount));
  qr.searchParams.set("des", orderCode);
  qr.searchParams.set("template", "compact");
  if (bankAccountName) qr.searchParams.set("name", bankAccountName);

  return json({
    success: true,
    orderCode,
    pack: packCode,
    packName: pack.label,
    amount: pack.amount,
    credits: pack.credits,
    expiresAt,
    qrUrl: qr.toString(),
    transferDescription: orderCode,
    bankAccountName: bankAccountName || null,
    bankAccount,
    bankCode,
  }, 200, origin);
});
