import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, Coins, CreditCard, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import type { DeveloperSession } from "../../../src/developer-auth/types";
import { authenticatedFetch, authHeader } from "./auth";

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "");
const ENDPOINT = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/api-credit-orders` : "";

const PACKS: Array<{ code: string; name: string; price: number; credits: number; hint: string; featured?: boolean; unit: string }> = [
  { code: "starter", name: "Starter", price: 29000, credits: 10000, hint: "Thử nghiệm tích hợp và các dự án nhỏ", unit: "Dành cho bắt đầu" },
  { code: "growth", name: "Growth", price: 99000, credits: 50000, hint: "Cân bằng chi phí cho ứng dụng đang chạy", featured: true, unit: "Lựa chọn phổ biến" },
  { code: "business", name: "Business", price: 299000, credits: 200000, hint: "Dành cho hệ thống có lượng request lớn", unit: "Chi phí mỗi lượt thấp nhất" },
];

type Purchase = { order_code: string; pack_code: string; credits: number; amount: number; status: string; created_at: string; paid_at: string | null };
type Checkout = { orderCode: string; pack: string; packName: string; amount: number; credits: number; expiresAt: string; qrUrl: string; transferDescription: string; bankAccountName: string | null; bankAccount: string; bankCode: string };
type State = { balance: number; purchases: Purchase[] };

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + "đ";
const count = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
const packName = (code: string) => PACKS.find(pack => pack.code === code)?.name ?? code;

function explainRequestError(error: unknown): Error {
  if (error instanceof Error && error.message !== "Failed to fetch") return error;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Error("Thiếu cấu hình Supabase ở môi trường deploy: cần VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY, sau đó build/deploy lại dashboard.");
  }
  return new Error("Không kết nối được dịch vụ API Credits. Hãy kiểm tra Edge Function api-credit-orders đã được deploy trên Supabase và CORS cho phép https://client.thangdc.com. Nếu vừa cập nhật cấu hình, hãy deploy lại dashboard rồi tải lại trang.");
}

export default function ApiCreditsPage({ session }: { session: DeveloperSession }) {
  const [state, setState] = useState<State>({ balance: 0, purchases: [] });
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPack, setBusyPack] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const request = useCallback(async (init?: RequestInit, query = "") => {
    if (!ENDPOINT) throw explainRequestError(new Error("Failed to fetch"));
    let response: Response;
    try {
      response = await authenticatedFetch(ENDPOINT + query, {
        ...init,
        headers: {
          ...authHeader(session),
          ...(SUPABASE_KEY ? { apikey: SUPABASE_KEY } : {}),
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
      });
    } catch (err) {
      throw explainRequestError(err);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof data.error === "string" ? data.error : `Request failed (${response.status})`;
      if (response.status === 404) throw new Error("Không tìm thấy API Credits. Kiểm tra Edge Function api-credit-orders đã được deploy đúng project Supabase.");
      if (response.status === 401) throw new Error("Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Hãy đăng xuất rồi đăng nhập lại.");
      if (response.status === 503 && message === "sepay_bank_transfer_not_configured") throw new Error("Thanh toán chưa được cấu hình trên máy chủ. Vui lòng thử lại sau.");
      throw new Error(message);
    }
    return data;
  }, [session]);

  const refresh = useCallback(async () => {
    const data = await request();
    setState({ balance: Number(data.balance ?? 0), purchases: data.purchases ?? [] });
  }, [request]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    request().then(data => {
      if (active) setState({ balance: Number(data.balance ?? 0), purchases: data.purchases ?? [] });
    }).catch(err => {
      if (active) setError(explainRequestError(err).message);
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
        // Keep the checkout visible; the user can retry manually.
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
      setError(explainRequestError(err).message);
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
    } catch (err) { setError(explainRequestError(err).message); }
  }

  return <div className="credits-page">
    <div className="page-head credits-page-head">
      <div><div className="eyebrow">DEVELOPER BILLING</div><h1>API Credits</h1><p className="muted">Nạp lượt dùng API khi vượt hạn mức miễn phí. Không tự động gia hạn, không phát sinh phí định kỳ.</p></div>
      <button className="secondary" onClick={() => { void refresh().catch(err => setError(explainRequestError(err).message)); }} disabled={loading}><RefreshCw size={15} /> Làm mới số dư</button>
    </div>

    {error && <div className="error banner credits-error" role="alert"><strong>Không thể hoàn tất yêu cầu</strong><span>{error}</span><button className="secondary" onClick={() => { setError(""); setLoading(true); void refresh().catch(err => setError(explainRequestError(err).message)).finally(() => setLoading(false)); }}>Thử lại</button></div>}
    {notice && <div className="success banner credits-notice" role="status"><CheckCircle2 size={18}/><span>{notice}</span><button className="icon-button" aria-label="Đóng thông báo" onClick={() => setNotice("")}>×</button></div>}

    <section className="credits-balance-panel">
      <div className="credits-balance-copy">
        <div className="credits-label"><Wallet size={16}/> SỐ DƯ HIỆN TẠI</div>
        <div className="credits-balance-number">{loading ? "…" : count(state.balance)} <span>lượt</span></div>
        <p>Mỗi request được chấp nhận sau khi vượt quota miễn phí sẽ trừ 1 lượt.</p>
        <div className="credits-trust"><ShieldCheck size={15}/> Chỉ cộng lượt sau khi SePay xác nhận thanh toán</div>
      </div>
      <div className="credits-balance-icon"><Coins size={32}/></div>
    </section>

    {!checkout ? <>
      <div className="credits-section-heading"><div><h2>Chọn gói nạp</h2><p>Thanh toán một lần · Lượt chưa dùng vẫn được giữ trong số dư</p></div><span className="credits-secure"><ShieldCheck size={14}/> Thanh toán qua SePay</span></div>
      <div className="credits-pack-grid">
        {PACKS.map(pack => <section key={pack.code} className={`credits-pack ${pack.featured ? "credits-pack-featured" : ""}`}>
          {pack.featured && <div className="credits-popular">PHỔ BIẾN NHẤT</div>}
          <div className="credits-pack-top"><span className="credits-pack-icon"><Coins size={19}/></span><span className="credits-pack-unit">{pack.unit}</span></div>
          <h3>{pack.name}</h3><p className="credits-pack-hint">{pack.hint}</p>
          <div className="credits-price">{money(pack.price)}</div>
          <div className="credits-amount">{count(pack.credits)} <span>lượt API</span></div>
          <div className="credits-unit-price">{(pack.price / pack.credits).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}đ / lượt</div>
          <div className="credits-pack-divider"/>
          <ul><li><CheckCircle2 size={15}/> Không hết hạn theo chu kỳ tháng</li><li><CheckCircle2 size={15}/> Không tự động gia hạn</li><li><CheckCircle2 size={15}/> Tự cộng sau khi nhận thanh toán</li></ul>
          <button className={pack.featured ? "primary full credits-buy" : "secondary full credits-buy"} disabled={!!busyPack || loading} onClick={() => void buy(pack.code)}>{busyPack === pack.code ? "Đang tạo đơn…" : <><CreditCard size={16}/> Nạp gói {pack.name}</>}</button>
        </section>)}
      </div>
      <div className="credits-how"><div className="credits-how-icon"><Clock3 size={18}/></div><div><strong>Cách tính lượt</strong><p>Quota miễn phí theo phút vẫn luôn được áp dụng. Lượt trả trước chỉ dùng khi API key cá nhân vượt quota ngày hoặc tháng đã cấu hình; API key hệ thống không sử dụng số dư của bạn.</p></div></div>
    </> : <section className="credits-checkout">
      <div className="credits-section-heading"><div><h2>Hoàn tất thanh toán</h2><p>Quét QR bằng ứng dụng ngân hàng và giữ nguyên nội dung chuyển khoản.</p></div><button className="secondary" onClick={() => setCheckout(null)}>Hủy / chọn gói khác</button></div>
      <div className="credits-checkout-layout">
        <div className="credits-qr-frame"><img src={checkout.qrUrl} alt="Mã QR chuyển khoản SePay"/><span><ShieldCheck size={14}/> QR chuyển khoản ngân hàng</span></div>
        <div className="credits-payment-details">
          <div className="credits-order-line"><span>Gói nạp</span><strong>{packName(checkout.pack)}</strong></div>
          <div className="credits-order-line"><span>Mã đơn hàng</span><code>{checkout.orderCode}</code></div>
          <div className="credits-order-line"><span>Hạn thanh toán</span><strong>{new Date(checkout.expiresAt).toLocaleTimeString("vi-VN")}</strong></div>
          <div className="credits-payment-total"><span>Số tiền cần chuyển</span><strong>{money(checkout.amount)}</strong></div>
          <label className="credits-transfer-label">Nội dung chuyển khoản <span>BẮT BUỘC</span></label>
          <div className="credits-transfer-code"><code>{checkout.transferDescription}</code><button className="secondary" onClick={() => { void navigator.clipboard.writeText(checkout.transferDescription); setNotice("Đã sao chép nội dung chuyển khoản."); }}>Sao chép</button></div>
          <div className="credits-bank-details"><span>Ngân hàng</span><strong>{checkout.bankCode}</strong><span>Số tài khoản</span><strong>{checkout.bankAccount}</strong>{checkout.bankAccountName && <><span>Chủ tài khoản</span><strong>{checkout.bankAccountName}</strong></>}</div>
          <p className="credits-payment-note">Chuyển đúng số tiền và nội dung. Hệ thống tự cộng lượt sau khi nhận webhook xác nhận; không cần gửi ảnh giao dịch.</p>
          <button className="primary full" onClick={() => void checkNow()}><RefreshCw size={16}/> Tôi đã chuyển khoản — kiểm tra</button>
        </div>
      </div>
    </section>}

    <section className="credits-history">
      <div className="credits-section-heading"><div><h2>Lịch sử giao dịch</h2><p>Hiển thị tối đa 20 đơn gần nhất. Chỉ đơn đã xác nhận mới được cộng lượt.</p></div></div>
      <div className="table-card credits-table-card"><table><thead><tr><th>Mã đơn</th><th>Gói nạp</th><th>Số lượt</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày tạo</th></tr></thead><tbody>
        {state.purchases.length === 0 ? <tr><td colSpan={6} className="credits-empty-row">{loading ? "Đang tải giao dịch…" : "Chưa có giao dịch mua lượt."}</td></tr> : state.purchases.map(p => <tr key={p.order_code}><td><code>{p.order_code}</code></td><td>{packName(p.pack_code)}</td><td>{count(p.credits)}</td><td>{money(p.amount)}</td><td><span className={`status ${p.status === "paid" ? "active" : p.status}`}>{p.status === "paid" ? "Đã thanh toán" : p.status === "pending" ? "Chờ thanh toán" : p.status === "expired" ? "Hết hạn" : p.status === "cancelled" ? "Đã hủy" : p.status}</span></td><td>{new Date(p.created_at).toLocaleString("vi-VN")}</td></tr>)}
      </tbody></table></div>
    </section>
  </div>;
}
