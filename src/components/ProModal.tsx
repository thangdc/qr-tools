import React, { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Loader2, ExternalLink, Sparkles, X } from 'lucide-react';
import { useLanguage } from '../i18n';
import {
  activateProLicense,
  createProOrder,
  getDeviceId,
  getOrderStatus,
  submitSePayCheckout,
  validateProLicense,
  type ProPlan,
} from '../services/revenueService';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPro: boolean;
  onTogglePro: (val: boolean) => void;
}

export const ProModal: React.FC<ProModalProps> = ({ isOpen, onClose, isPro, onTogglePro }) => {
  const { tx } = useLanguage();
  const [plan, setPlan] = useState<ProPlan>('monthly');
  const [email, setEmail] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [amount, setAmount] = useState(0);
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'active' | 'checkout' | 'license'>('active');
  const [copied, setCopied] = useState(false);
  const [activeDevices, setActiveDevices] = useState<number | null>(null);
  const [maxDevices, setMaxDevices] = useState<number | null>(null);

  const ORDER_SESSION_KEY = 'qr_tools_checkout_session';

  const clearOrderSession = () => {
    try { localStorage.removeItem(ORDER_SESSION_KEY); } catch { /* ignore storage errors */ }
  };

  const copyLicenseKey = async () => {
    if (!licenseKey) return;
    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setMessage(tx('Không thể sao chép License Key.', 'Unable to copy the License Key.'));
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setMessage(null);
      setLoading(false);
      setChecking(false);
      setCopied(false);
      return;
    }

    try {
      const savedExpiry = localStorage.getItem('qr_tools_pro_expires_at');
      if (savedExpiry) setExpiresAt(savedExpiry);
      const savedKey = localStorage.getItem('qr_tools_license_key');
      if (savedKey) setLicenseKey(savedKey);
      const savedEmail = localStorage.getItem('qr_tools_license_email');
      if (savedEmail) setEmail(savedEmail);
      setActivePanel(isPro ? 'active' : 'checkout');
      const raw = localStorage.getItem(ORDER_SESSION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        email?: string;
        orderCode?: string;
        amount?: number;
        plan?: ProPlan;
      };
      if (saved.email && saved.orderCode) {
        setEmail(saved.email);
        setOrderCode(saved.orderCode);
        setAmount(saved.amount || 0);
        if (saved.plan) setPlan(saved.plan);
        setPaymentStarted(true);
      }
    } catch {
      clearOrderSession();
    }
  }, [isOpen, isPro]);

  useEffect(() => {
    if (!isOpen || !isPro) return;
    let cancelled = false;

    const restoreLicenseStatus = async () => {
      try {
        const savedEmail = localStorage.getItem('qr_tools_license_email');
        const activationToken = localStorage.getItem('qr_tools_activation_token');
        if (!savedEmail || !activationToken) return;

        const result = await validateProLicense(savedEmail, getDeviceId(), activationToken);
        if (cancelled) return;

        if (result.success && result.expiresAt) {
          setExpiresAt(result.expiresAt);
          setActiveDevices(result.activeDevices ?? null);
          setMaxDevices(result.maxDevices ?? null);
          localStorage.setItem('qr_tools_pro_expires_at', result.expiresAt);
          return;
        }

        localStorage.removeItem('qr_tools_pro_expires_at');
        onTogglePro(false);
        setActivePanel('checkout');
        setMessage(tx('License đã hết hạn hoặc không còn hợp lệ. Bạn có thể gia hạn hoặc nhập License Key khác.', 'The license has expired or is no longer valid. You can renew or enter another License Key.'));
      } catch {
        // Keep the locally cached Pro state when validation is temporarily unavailable.
      }
    };

    void restoreLicenseStatus();
    return () => { cancelled = true; };
  }, [isOpen, isPro, onTogglePro, tx]);

  useEffect(() => {
    if (!isOpen || !orderCode || !email || isPro) return;
    let cancelled = false;

    const check = async () => {
      if (cancelled) return;
      setChecking(true);
      try {
        const result = await getOrderStatus(email, orderCode);
        if (cancelled) return;

        if (result.status === 'expired' || result.status === 'cancelled') {
          clearOrderSession();
          setPaymentStarted(false);
          setOrderCode('');
          setAmount(0);
          return;
        }

        if (result.status !== 'paid' || !result.licenseKey) return;

        setLicenseKey(result.licenseKey);
        setLoading(true);

        try {
          const activation = await activateProLicense(
            email.trim(),
            result.licenseKey,
            getDeviceId(),
          );

          if (cancelled) return;

          if (activation.expiresAt) {
            setExpiresAt(activation.expiresAt);
            setActiveDevices(activation.activeDevices ?? null);
            setMaxDevices(activation.maxDevices ?? null);
            try { localStorage.setItem('qr_tools_pro_expires_at', activation.expiresAt); } catch { /* ignore storage errors */ }
          }
          try {
            localStorage.setItem('qr_tools_license_email', email.trim());
            localStorage.setItem('qr_tools_license_key', result.licenseKey);
            if (activation.activationToken) localStorage.setItem('qr_tools_activation_token', activation.activationToken);
          } catch { /* ignore storage errors */ }

          if (!activation.success) {
            setMessage(tx(
              'Đã nhận thanh toán nhưng chưa kích hoạt được Pro. Bạn có thể bấm Kích hoạt để thử lại.',
              'Payment received, but Pro activation could not be completed. You can click Activate to retry.',
            ));
            return;
          }

          clearOrderSession();
          onTogglePro(true);
          setActivePanel('active');
          setMessage(tx(
            'Thanh toán thành công. Pro đã được tự động kích hoạt trên thiết bị này.',
            'Payment received. Pro has been activated automatically on this device.',
          ));
        } catch (error) {
          if (!cancelled) {
            setMessage(error instanceof Error
              ? error.message
              : tx('Đã nhận thanh toán nhưng kích hoạt Pro thất bại.', 'Payment received, but Pro activation failed.'));
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      } catch {
        // Best-effort polling.
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    const timer = window.setInterval(check, 4000);
    void check();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [email, isOpen, isPro, onTogglePro, orderCode, tx]);

  if (!isOpen) return null;

  const openCheckout = () => {
    setMessage(null);
    setPaymentStarted(false);
    setOrderCode('');
    setAmount(0);
    clearOrderSession();
    setActivePanel('checkout');
  };

  const openLicense = () => {
    setMessage(null);
    setActivePanel('license');
    try {
      const savedEmail = localStorage.getItem('qr_tools_license_email');
      const savedKey = localStorage.getItem('qr_tools_license_key');
      if (savedEmail) setEmail(savedEmail);
      if (savedKey) setLicenseKey(savedKey);
    } catch { /* ignore storage errors */ }
  };

  const startCheckout = async () => {
    if (!email.trim()) {
      setMessage(tx('Vui lòng nhập email nhận License.', 'Enter the email for your license.'));
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await createProOrder(email.trim(), plan);
      if (!result.success || !result.orderCode || !result.checkoutEndpoint || !result.checkoutFields) {
        throw new Error(result.message || 'Không thể tạo đơn hàng.');
      }

      setOrderCode(result.orderCode);
      setAmount(result.amount || 0);
      try {
        localStorage.setItem(ORDER_SESSION_KEY, JSON.stringify({
          email: email.trim(),
          orderCode: result.orderCode,
          amount: result.amount || 0,
          plan,
        }));
      } catch { /* polling still works for the current tab */ }
      const paymentWindow = submitSePayCheckout(result.checkoutEndpoint, result.checkoutFields);

      if (!paymentWindow) {
        clearOrderSession();
        setPaymentStarted(false);
        setOrderCode('');
        setAmount(0);
        setMessage(tx(
          'Trình duyệt đã chặn cửa sổ thanh toán. Hãy cho phép popup rồi bấm thanh toán lại.',
          'Your browser blocked the payment window. Allow popups and try again.',
        ));
        return;
      }

      setPaymentStarted(true);
      setMessage(tx(
        'Đã mở trang thanh toán SePay. Sau khi thanh toán xong, quay lại tab này để hệ thống tự xác nhận.',
        'SePay checkout is open. After payment, return to this tab and it will confirm automatically.',
      ));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tạo đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  const activate = async () => {
    if (!email.trim() || !licenseKey.trim()) {
      setMessage(tx('Cần email và License Key.', 'Email and License Key are required.'));
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const normalizedEmail = email.trim();
      const normalizedLicenseKey = licenseKey.trim();
      const result = await activateProLicense(normalizedEmail, normalizedLicenseKey, getDeviceId());
      if (!result.success) throw new Error(result.message || 'Kích hoạt thất bại.');
      if (result.expiresAt) {
        setExpiresAt(result.expiresAt);
        setActiveDevices(result.activeDevices ?? null);
        setMaxDevices(result.maxDevices ?? null);
        try { localStorage.setItem('qr_tools_pro_expires_at', result.expiresAt); } catch { /* ignore storage errors */ }
      }
      try {
        localStorage.setItem('qr_tools_license_email', normalizedEmail);
        localStorage.setItem('qr_tools_license_key', normalizedLicenseKey);
        if (result.activationToken) localStorage.setItem('qr_tools_activation_token', result.activationToken);
      } catch { /* ignore storage errors */ }
      onTogglePro(true);
      setActivePanel('active');
      setMessage(tx('Pro đã được kích hoạt trên thiết bị này.', 'Pro is activated on this device.'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kích hoạt thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-xl w-full overflow-hidden">
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-blue-50 text-blue-600"><Sparkles className="w-4 h-4" /></span>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">QR Tools Pro</h2>
              <p className="text-xs text-neutral-500">{tx('Tạo QR hàng loạt, xuất và in chuyên nghiệp.', 'Batch QR generation, export and professional printing.')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 p-1 rounded cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {isPro && activePanel === 'active' ? (
          <div className="p-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900">{tx('Pro đang hoạt động', 'Pro is active')}</h3>
              <p className="mt-1 text-sm text-neutral-600">
                {tx('Bạn đã có đầy đủ tính năng Pro trên thiết bị này.', 'You already have access to all Pro features on this device.')}
              </p>
              {activeDevices !== null && maxDevices !== null && (
                <div className="mt-2 text-sm text-neutral-700">
                  <span className="text-neutral-500">{tx('Thiết bị', 'Devices')}:</span>{' '}
                  <span className="font-semibold">{activeDevices}/{maxDevices}</span>
                </div>
              )}
              <div className="mt-3 text-sm text-neutral-700">
                <span className="text-neutral-500">{tx('Hết hạn', 'Expires')}:</span>{' '}
                <span className="font-semibold">
                  {expiresAt
                    ? new Date(expiresAt).toLocaleDateString(tx('vi-VN', 'en-US'), { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : tx('Chưa có thông tin', 'Not available')}
                </span>
              </div>
              {licenseKey && (
                <div className="mt-4 text-left">
                  <label className="text-xs font-semibold text-neutral-700">{tx('License Key', 'License Key')}</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      value={licenseKey}
                      readOnly
                      aria-label="License Key"
                      className="min-w-0 flex-1 h-9 px-3 text-xs bg-white border border-neutral-300 rounded-md font-mono"
                    />
                    <button
                      type="button"
                      onClick={copyLicenseKey}
                      className="shrink-0 h-9 px-3 rounded-md border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-medium flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? tx('Đã sao chép', 'Copied') : tx('Sao chép', 'Copy')}
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={openCheckout} className="h-10 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-semibold">
                  {tx('Gia hạn Pro', 'Renew Pro')}
                </button>
                <button type="button" onClick={openLicense} className="h-10 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 text-sm font-semibold">
                  {tx('Nhập License Key', 'Enter License Key')}
                </button>
              </div>
              <button type="button" onClick={onClose} className="mt-2 w-full h-9 rounded-lg text-neutral-600 hover:bg-white text-xs font-medium">
                {tx('Đóng', 'Close')}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {activePanel === 'checkout' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {([['monthly', '59.000 ₫ / tháng'], ['yearly', '499.000 ₫ / năm']] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPlan(id)}
                      className={`rounded-lg border p-3 text-left ${plan === id ? 'border-blue-500 bg-blue-50' : 'border-neutral-200 hover:border-neutral-300'}`}
                    >
                      <div className="text-sm font-semibold text-neutral-900">{label}</div>
                      <div className="text-xs text-neutral-500 mt-1">
                        {id === 'yearly' ? tx('Dành cho người dùng thường xuyên', 'For regular users') : tx('Gói tháng linh hoạt', 'Flexible monthly plan')}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-700">{tx('Email nhận License', 'License email')}</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="you@example.com"
                    className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:border-blue-600"
                  />
                </div>

                {!paymentStarted ? (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={startCheckout}
                    className="w-full h-10 rounded-lg bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {tx('Thanh toán qua SePay', 'Pay with SePay')}
                    <ExternalLink className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-neutral-900">{tx('Đơn hàng', 'Order')}</span>
                      <span className="font-mono text-xs text-neutral-700">{orderCode}</span>
                    </div>
                    <div className="text-sm text-neutral-700">{amount.toLocaleString('vi-VN')} ₫</div>
                    <div className="text-xs text-neutral-500">
                      {checking ? tx('Đang chờ SePay xác nhận thanh toán…', 'Waiting for SePay payment confirmation…') : tx('Đang tự động kiểm tra trạng thái.', 'Payment status is checked automatically.')}
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setPaymentStarted(false);
                        setOrderCode('');
                        setAmount(0);
                        setLicenseKey('');
                        setMessage(null);
                        clearOrderSession();
                      }}
                      className="w-full h-9 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 disabled:opacity-50 text-neutral-800 text-xs font-semibold"
                    >
                      {tx('Tạo đơn hàng mới / Thanh toán lại', 'Create new order / Pay again')}
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="pt-2 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-neutral-500" />
                  {tx('Kích hoạt License', 'Activate license')}
                </label>
                {isPro && (
                  <button type="button" onClick={() => setActivePanel('active')} className="text-xs text-neutral-500 hover:text-neutral-900">
                    {tx('Quay lại', 'Back')}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="License Key"
                  className="flex-1 h-9 px-3 text-xs bg-white border border-neutral-300 rounded-md font-mono focus:outline-hidden focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={activate}
                  disabled={loading}
                  className="px-3.5 h-9 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-md text-xs font-medium flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {tx('Kích hoạt', 'Activate')}
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-2 text-xs text-neutral-600">
              {[tx('Batch Import Excel/CSV', 'Excel/CSV batch import'), tx('Xuất ZIP hàng loạt', 'Bulk ZIP export'), tx('In nhiều QR A4', 'Multi-QR A4 printing'), tx('Export độ phân giải cao', 'High-resolution export')].map((item) =>
                <div key={item} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" />{item}</div>
              )}
            </div>

            {message && <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2 text-xs text-neutral-700">{message}</div>}
          </div>
        )}
      </div>
    </div>
  );
};
