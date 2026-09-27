import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import { X, Check, Sparkles, KeyRound } from 'lucide-react';

interface ProModalProps {
  isOpen: boolean;
  on{tx('Đóng', 'Close')}: () => void;
  isPro: boolean;
  onTogglePro: (val: boolean) => void;
}

export const ProModal: React.FC<ProModalProps> = ({
  isOpen,
  on{tx('Đóng', 'Close')},
  isPro,
  onTogglePro,
}) => {
  const { tx } = useLanguage();
  const [licenseKey, setLicenseKey] = useState('');
  const [keyMessage, setKeyMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handle{tx('Kích hoạt', 'Activate')}Key = () => {
    if (licenseKey.trim().toUpperCase() === 'QRPRO-2026' || licenseKey.trim().length >= 6) {
      onTogglePro(true);
      setKeyMessage('Pro license activated successfully!');
      setTimeout(() => {
        setKeyMessage(null);
        on{tx('Đóng', 'Close')}();
      }, 1200);
    } else {
      setKeyMessage('Please enter a valid key or click Instant Demo Activation below.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-lg border border-neutral-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-blue-50 text-blue-600">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                QR Tools Pro
              </h2>
              <p className="text-xs text-neutral-500">
                {tx('Tính năng chuyên nghiệp cho quy trình khối lượng lớn', 'Professional utility features for high-volume workflows')}
              </p>
            </div>
          </div>
          <button
            onClick={on{tx('Đóng', 'Close')}}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feature comparison table */}
        <div className="p-5 space-y-4">
          <div className="border border-neutral-200 rounded-md overflow-hidden text-xs">
            <div className="grid grid-cols-3 bg-neutral-50 p-2.5 font-medium text-neutral-600 border-b border-neutral-200">
              <span className="col-span-1">{tx('Tính năng', 'Feature')}</span>
              <span className="text-center">{tx('Gói miễn phí', 'Free Plan')}</span>
              <span className="text-center font-semibold text-neutral-900">{tx('Gói Pro', 'Pro Plan')}</span>
            </div>

            <div className="divide-y divide-neutral-100">
              <div className="grid grid-cols-3 p-2.5 items-center">
                <span className="text-neutral-700">{tx('Tất cả 9 loại QR (bao gồm VietQR)', 'All 9 QR Types (incl. VietQR)')}</span>
                <span className="text-center text-neutral-600">{tx('Không giới hạn', 'Unlimited')}</span>
                <span className="text-center font-medium text-blue-600">{tx('Không giới hạn', 'Unlimited')}</span>
              </div>
              <div className="grid grid-cols-3 p-2.5 items-center bg-neutral-50/40">
                <span className="text-neutral-700">{tx('Xuất PNG & SVG độ phân giải cao', 'High-Res PNG & SVG Export')}</span>
                <span className="text-center text-neutral-600">{tx('Tối đa 2048px', 'Up to 2048px')}</span>
                <span className="text-center font-medium text-blue-600">{tx('Tối đa 4096px', 'Up to 4096px')}</span>
              </div>
              <div className="grid grid-cols-3 p-2.5 items-center">
                <span className="text-neutral-700">{tx('Nhập Excel / CSV hàng loạt', 'Excel / CSV Batch Import')}</span>
                <span className="text-center text-neutral-400">—</span>
                <span className="text-center font-medium text-emerald-600">{tx('Có sẵn', 'Included')}</span>
              </div>
              <div className="grid grid-cols-3 p-2.5 items-center bg-neutral-50/40">
                <span className="text-neutral-700">{tx('Đóng gói ZIP hàng loạt', 'Bulk ZIP Archive Packaging')}</span>
                <span className="text-center text-neutral-400">—</span>
                <span className="text-center font-medium text-emerald-600">{tx('Có sẵn', 'Included')}</span>
              </div>
              <div className="grid grid-cols-3 p-2.5 items-center">
                <span className="text-neutral-700">{tx('Tờ nhãn dán có thể in', 'Printable Sticker Sheets')}</span>
                <span className="text-center text-neutral-400">{tx('Đơn', 'Single')}</span>
                <span className="text-center font-medium text-emerald-600">{tx('Nhiều lưới A4', 'Multi-grid A4')}</span>
              </div>
            </div>
          </div>

          {/* Key input or quick toggle */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-neutral-500" />
              <span>{tx('Kích hoạt mã bản quyền', 'License Key Activation')}</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="{tx('Nhập mã bản quyền (VD: QRPRO-2026)', 'Enter license key (e.g. QRPRO-2026)')}"
                className="flex-1 h-9 px-3 text-xs bg-white border border-neutral-300 rounded-md font-mono focus:outline-hidden focus:border-blue-600"
              />
              <button
                type="button"
                onClick={handle{tx('Kích hoạt', 'Activate')}Key}
                className="px-3.5 h-9 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
              >
                {tx('Kích hoạt', 'Activate')}
              </button>
            </div>
            {keyMessage && (
              <p className="mt-1.5 text-xs text-blue-600 font-medium">{keyMessage}</p>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onTogglePro(!isPro);
              on{tx('Đóng', 'Close')}();
            }}
            className="text-xs font-medium text-neutral-600 hover:text-neutral-900 underline cursor-pointer"
          >
            {isPro ? '{tx('Tắt Pro (Chuyển về miễn phí)', 'Deactivate Pro (Switch to Free)')}' : '{tx('Dùng thử Pro 1 chạm', 'Instant 1-Click Pro Trial')}'}
          </button>

          <button
            type="button"
            onClick={on{tx('Đóng', 'Close')}}
            className="px-4 py-1.5 text-xs font-medium bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-md transition-colors cursor-pointer"
          >
            {tx('Đóng', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};
