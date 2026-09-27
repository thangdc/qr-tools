import React from 'react';
import { X, ShieldCheck, Lock, WifiOff, EyeOff } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  on{tx('Đóng', 'Close')}: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, on{tx('Đóng', 'Close')} }) => {
  const { tx } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-lg border border-neutral-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-semibold text-neutral-900">
              100% Client-Side & Private Guarantee
            </h2>
          </div>
          <button
            onClick={on{tx('Đóng', 'Close')}}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-neutral-600">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded bg-neutral-100 text-neutral-800 shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-neutral-900 block mb-0.5">
                Zero Cloud Storage
              </span>
              <p className="text-neutral-500 leading-relaxed">
                All QR codes, bank accounts, Wi-Fi credentials, and contact details are generated locally on your computer's browser using HTML5 Canvas. Nothing is ever sent to a remote database.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded bg-neutral-100 text-neutral-800 shrink-0 mt-0.5">
              <WifiOff className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-neutral-900 block mb-0.5">
                Offline Capable
              </span>
              <p className="text-neutral-500 leading-relaxed">
                You can disconnect your internet and continue creating, customizing, and exporting high-resolution QR codes without interruption.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded bg-neutral-100 text-neutral-800 shrink-0 mt-0.5">
              <EyeOff className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-neutral-900 block mb-0.5">
                Zero Analytics & Telemetry Tracking
              </span>
              <p className="text-neutral-500 leading-relaxed">
                We do not log user activities, scan queries, or payload contents. History is saved exclusively in your browser's private localStorage.
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-neutral-50 border-t border-neutral-100 flex justify-end">
          <button
            type="button"
            onClick={on{tx('Đóng', 'Close')}}
            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-xs font-medium transition-colors cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
