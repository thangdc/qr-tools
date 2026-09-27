import React from 'react';
import { useLanguage } from '../../i18n';
import { UrlData } from '../../types/qr';
import { Link2, X, ClipboardPaste, BarChart3, Sparkles } from 'lucide-react';

interface UrlFormProps {
  data: UrlData;
  onChange: (data: UrlData) => void;
  onOpenAnalytics?: () => void;
}

export const UrlForm: React.FC<UrlFormProps> = ({ data, onChange, onOpenAnalytics }) => {
  const { tx } = useLanguage();
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange({ url: text.trim() });
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="url-input"
            className="text-xs font-semibold text-neutral-800 uppercase tracking-wider"
          >
            URL đích
          </label>
          <button
            type="button"
            onClick={handlePaste}
            className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
            title="Dán từ bộ nhớ tạm"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Dán</span>
          </button>
        </div>

        <div className="relative flex items-center">
          <Link2 className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
          <input
            id="url-input"
            type="url"
            value={data.url}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://yourwebsite.com/menu"
            autoFocus
            className="w-full h-10 pl-9 pr-8 bg-white text-neutral-900 border border-neutral-300 rounded-lg text-xs sm:text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-mono"
          />
          {data.url && (
            <button
              type="button"
              onClick={() => onChange({ url: '' })}
              className="absolute right-2.5 p-0.5 text-neutral-400 hover:text-neutral-700 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            Nhập liên kết web. Hỗ trợ https://, liên kết tên miền hoặc liên kết ứng dụng.
          </p>
          {onOpenAnalytics && (
            <button
              type="button"
              onClick={onOpenAnalytics}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              <BarChart3 className="w-3 h-3" />
              <span>Theo dõi lượt quét</span>
            </button>
          )}
        </div>
      </div>

      <div className="pt-1">
        <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block mb-1.5">
          Preset Examples:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {['https://menu.restaurant.vn', 'https://github.com', 'https://vietqr.vn'].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => onChange({ url: sample })}
              className="text-xs font-mono text-neutral-600 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

