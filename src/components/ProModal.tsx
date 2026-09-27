import React, { useEffect, useState } from 'react';
import { Check, KeyRound, Loader2, ExternalLink, Sparkles, X } from 'lucide-react';
import { useLanguage } from '../i18n';
import {
  activateProLicense,
  createProOrder,
  getDeviceId,
  getOrderStatus,
  submitSePayCheckout,
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

  useEffect(() => {
    if (!isOpen) {
      setMessage(null);
      setLoading(false);
      setChecking(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !orderCode || !email || isPro) return;
    let cancelled = false;

    const check = async () => {
      if (cancelled) return;
      setChecking(true);
      try {
        const result = await getOrderStatus(email, orderCode);
        if (!cancelled && result.status === 'paid' && result.licenseKey) {
          setLicenseKey(result.licenseKey);
          setMessage(tx('Đã nhận thanh toán. Bấm Kích hoạt Pro để hoàn tất.', 'Payment received. Activate Pro to finish setup.'));
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
  }, [email, isOpen, isPro, orderCode, tx]);

  if (!isOpen) return null;

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
      const paymentWindow = submitSePayCheckout(result.checkoutEndpoint, result.checkoutFields);

      if (!paymentWindow) {
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
      const result = await activateProLicense(email.trim(), licenseKey.trim(), getDeviceId());
      if (!result.success) throw new Error(result.message || 'Kích hoạt thất bại.');
      onTogglePro(true);
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

        <div className="p-5 space-y-4">
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
                }}
                className="w-full h-9 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 disabled:opacity-50 text-neutral-800 text-xs font-semibold"
              >
                {tx('Tạo đơn hàng mới / Thanh toán lại', 'Create new order / Pay again')}
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-neutral-100">
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-neutral-500" />
              {tx('Kích hoạt License', 'Activate license')}
            </label>
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
      </div>
    </div>
  );
};
