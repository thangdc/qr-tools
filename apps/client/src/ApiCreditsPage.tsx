import React, { useCallback, useEffect, useState } from "react";
import type { DeveloperSession } from "../../../src/developer-auth/types";
import { authenticatedFetch, authHeader } from "./auth";

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-credit-orders`;
const PACKS = [
  { code: "starter", name: "Starter", price: 29000, credits: 10000, hint: "Dùng thử tích hợp thực tế" },
  { code: "growth", name: "Growth", price: 99000, credits: 50000, hint: "Phù hợp dự án đang tăng trưởng", featured: true },
  { code: "business", name: "Business", price: 299000, credits: 200000, hint: "Dành cho mức sử dụng cao" },
] as const;

type Purchase = { order_code: string; pack_code: string; credits: number; amount: number; status: string; created_at: string; paid_at: string | null };
type Checkout = { orderCode: string; pack: string; packName: string; amount: number; credits: number; expiresAt: string; qrUrl: string; transferDescription: string; bankAccountName: string | null; bankAccount: string; bankCode: string };
type State = { balance: number; purchases: Purchase[] };

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + "đ";
const count = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

export default function ApiCreditsPage({ session }: { session: DeveloperSession }) {
  const [state, setState] = useState<State>({ balance: 0, purchases: [] });
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPack, setBusyPack] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const request = useCallback(async (init?: RequestInit, query = "") => {
    const response = await authenticatedFetch(ENDPOINT + query, {
      ...init,
      headers: { ...authHeader(session), "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }, [session]);

  const refresh = useCallback(async () => {
    const data = await request();
    setState({ balance: Number(data.balance ?? 0), purchases: data.purchases ?? [] });
  }, [request]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    request().then(data => {
      if (active) setState({ balance: Number(data.balance ?? 0), purchases: data.purchases ?? [] });
    }).catch(err => {
      if (active) setError(err instanceof Error ? err.message : "Không tải được số dư lượt.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [request]);

  useEffect(() => {
    if (!checkout) return;
    let active = true;
    const check = async () => {
      try {
        const data = await request(undefined, "?orderCode=" + encodeURIComponent(checkout.orderCode));
        if (!active) return;
        const purchase = data.purchase as Purchase | undefined;
        if (purchase?.status === "paid") {
          setNotice(`Thanh toán thành công! Đã cộng ${count(purchase.credits)} lượt vào số dư.`);
          setCheckout(null);
          await refresh();
        } else if (purchase?.status === "expired" || purchase?.status === "cancelled") {
          setNotice("Đơn hàng đã hết hạn hoặc bị hủy. Bạn có thể tạo đơn mới.");
          setCheckout(null);
          await refresh();
        }
      } catch {
        // Keep the QR visible; the user can retry the status check manually.
      }
    };
    const timer = window.setInterval(() => { void check(); }, 4000);
    void check();
    return () => { active = false; window.clearInterval(timer); };
  }, [checkout, request, refresh]);

  async function buy(pack: string) {
    setBusyPack(pack); setError(""); setNotice("");
    try {
      const data = await request({ method: "POST", body: JSON.stringify({ pack }) });
      setCheckout(data as Checkout);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được đơn hàng.");
    } finally { setBusyPack(""); }
  }

  async function checkNow() {
    if (!checkout) return;
    setError("");
    try {
      const data = await request(undefined, "?orderCode=" + encodeURIComponent(checkout.orderCode));
      if (data.purchase?.status === "paid") {
        setNotice(`Thanh toán thành công! Đã cộng ${count(data.purchase.credits)} lượt vào số dư.`);
        setCheckout(null);
        await refresh();
      } else {
        setNotice("Chưa nhận được giao dịch khớp đơn hàng. Hãy đợi một chút rồi kiểm tra lại.");
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Không kiểm tra được thanh toán."); }
  }

  return <div>
    <div className="page-head">
      <div><div className="eyebrow">Developer</div><h1>API Credits</h1><p className="muted">Mua thêm lượt khi vượt hạn mức miễn phí. Không có tự động gia hạn.</p></div>
      <button className="secondary" onClick={() => { void refresh().catch(err => setError(err.message)); }} disabled={loading}>Refresh</button>
    </div>

    <section className="docs-card" style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div><div className="muted">Số dư lượt đã mua</div><div style={{ fontSize: 32, fontWeight: 750, marginTop: 6 }}>{loading ? "…" : count(state.balance)}</div><div className="muted">1 request API vượt quota miễn phí sẽ dùng 1 lượt đã mua.</div></div>
        <div style={{ border: "1px solid var(--border, #d9dee7)", borderRadius: 12, padding: "12px 16px", minWidth: 180 }}><strong>Miễn phí + trả trước</strong><p className="muted" style={{ marginBottom: 0 }}>Key hệ thống không bị tính phí. Key cá nhân dùng số dư khi vượt quota.</p></div>
      </div>
    </section>

    {error && <div className="error banner">{error}</div>}
    {notice && <div className="success banner" role="status">{notice}</div>}

    {checkout ? <section className="docs-card" style={{ marginBottom: 18 }}>
      <div className="generated-head"><div><h2>Quét QR để thanh toán</h2><p className="muted">Đơn hàng <code>{checkout.orderCode}</code> · Hạn đến {new Date(checkout.expiresAt).toLocaleTimeString("vi-VN")}</p></div><button className="secondary" onClick={() => setCheckout(null)}>Đóng</button></div>
      <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
        <img src={checkout.qrUrl} alt="Mã QR chuyển khoản SePay" style={{ width: 240, height: 240, objectFit: "contain", border: "1px solid var(--border, #d9dee7)", borderRadius: 12 }} />
        <div style={{ minWidth: 240, flex: 1 }}>
          <div className="muted">Số tiền</div><div style={{ fontSize: 26, fontWeight: 750 }}>{money(checkout.amount)}</div>
          <p><span className="muted">Ngân hàng / tài khoản:</span><br /><strong>{checkout.bankCode} · {checkout.bankAccount}</strong>{checkout.bankAccountName ? <><br />{checkout.bankAccountName}</> : null}</p>
          <p><span className="muted">Nội dung chuyển khoản (bắt buộc):</span><br /><code style={{ fontSize: 18, fontWeight: 700 }}>{checkout.transferDescription}</code></p>
          <p className="muted">Chuyển đúng số tiền và giữ nguyên nội dung để hệ thống tự cộng lượt. Không gửi ảnh chụp giao dịch làm bằng chứng thay cho webhook.</p>
          <button className="primary" onClick={() => void checkNow()}>Tôi đã chuyển khoản — kiểm tra</button>
        </div>
      </div>
    </section> : <div className="metric-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 18 }}>
      {PACKS.map(pack => <section key={pack.code} className="docs-card" style={{ border: pack.featured ? "2px solid var(--accent, #4f46e5)" : undefined, position: "relative" }}>
        {pack.featured && <div className="eyebrow">Phổ biến</div>}
        <h2>{pack.name}</h2><div style={{ fontSize: 28, fontWeight: 750, margin: "8px 0" }}>{money(pack.price)}</div>
        <div style={{ fontSize: 20, fontWeight: 650 }}>{count(pack.credits)} lượt</div>
        <p className="muted">{pack.hint}</p>
        <p className="muted">{(pack.price / pack.credits).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}đ / lượt</p>
        <button className="primary full" disabled={!!busyPack || loading} onClick={() => void buy(pack.code)}>{busyPack === pack.code ? "Đang tạo đơn…" : "Mua lượt"}</button>
      </section>)}
    </div>}

    <section className="usage-section">
      <div className="section-head"><div><h2>Lịch sử mua lượt</h2><p className="muted">Chỉ đơn thanh toán đã được xác nhận mới cộng lượt.</p></div></div>
      <div className="table-card"><table><thead><tr><th>Mã đơn</th><th>Gói</th><th>Lượt</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày tạo</th></tr></thead><tbody>
        {state.purchases.length === 0 ? <tr><td colSpan={6}>Chưa có giao dịch mua lượt.</td></tr> : state.purchases.map(p => <tr key={p.order_code}><td><code>{p.order_code}</code></td><td>{p.pack_code}</td><td>{count(p.credits)}</td><td>{money(p.amount)}</td><td><span className={`status ${p.status === "paid" ? "active" : p.status}`}>{p.status === "paid" ? "Đã thanh toán" : p.status === "pending" ? "Chờ thanh toán" : p.status}</span></td><td>{new Date(p.created_at).toLocaleString("vi-VN")}</td></tr>)}
      </tbody></table></div>
    </section>
  </div>;
}
