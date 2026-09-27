import React from 'react';
import { TextData } from '../../types/qr';
import { FileText, X } from 'lucide-react';

interface TextFormProps {
  data: TextData;
  onChange: (data: TextData) => void;
}

export const TextForm: React.FC<TextFormProps> = ({ data, onChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="text-input"
            className="text-xs font-semibold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-neutral-400" />
            <span>Plain Text & Notes</span>
          </label>
          <div className="flex items-center gap-2">
            {data.text && (
              <button
                type="button"
                onClick={() => onChange({ text: '' })}
                className="text-[11px] text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                Clear
              </button>
            )}
            <span className="text-[10px] text-neutral-500 font-mono px-1.5 py-0.5 rounded bg-neutral-100 tabular-nums">
              {data.text.length} chars
            </span>
          </div>
        </div>

        <textarea
          id="text-input"
          rows={5}
          value={data.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Enter plain text, promotional notice, event address, or instructions..."
          className="w-full p-3 bg-white text-neutral-900 border border-neutral-300 rounded-lg text-xs sm:text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors resize-y leading-relaxed font-mono"
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          Scanned by any standard camera app. Displays offline without requiring an active internet connection.
        </p>
      </div>

      <div className="pt-1">
        <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block mb-1.5">
          Quick Prompts:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {[
            '🎉 Giảm 15% cho lần ghé thăm tiếp theo!',
            '📍 Địa chỉ: 123 Lê Lợi, P. Bến Nghé, Quận 1',
            '⏱️ Giờ mở cửa: 08:00 - 22:00 hàng ngày',
          ].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => onChange({ text: sample })}
              className="text-xs text-neutral-600 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
