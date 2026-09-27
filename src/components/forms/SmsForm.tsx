import React from 'react';
import { useLanguage } from '../../i18n';
import { SmsData } from '../../types/qr';

interface SmsFormProps {
  data: SmsData;
  onChange: (data: SmsData) => void;
}

export const SmsForm: React.FC<SmsFormProps> = ({ data, onChange }) => {
  const { tx } = useLanguage();
  return (
    <div className="space-y-3.5">
      <div>
        <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
          Số điện thoại
        </label>
        <input
          type="tel"
          value={data.phone}
          onChange={(e) => onChange({ ...data, phone: e.target.value })}
          placeholder="e.g. +84 901 234 567"
          className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-mono"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
          Nội dung tin nhắn
        </label>
        <textarea
          rows={3}
          value={data.message}
          onChange={(e) => onChange({ ...data, message: e.target.value })}
          placeholder="Nội dung SMS soạn sẵn..."
          className="w-full p-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors resize-y"
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          Tạo bản nháp SMS trong ứng dụng Nhắn tin mặc định khi quét.
        </p>
      </div>
    </div>
  );
};
