import React from 'react';
import { SmsData } from '../../types/qr';
import { useLanguage } from '../../i18n';

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
          {tx('Số điện thoại', 'Phone Number')}
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
          {tx('Nội dung tin nhắn', 'Message Body')}
        </label>
        <textarea
          rows={3}
          value={data.message}
          onChange={(e) => onChange({ ...data, message: e.target.value })}
          placeholder="{tx('Nội dung SMS soạn sẵn...', 'Pre-composed SMS text...')}"
          className="w-full p-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors resize-y"
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          {tx('Tạo tin nhắn nháp trong ứng dụng nhắn tin mặc định khi quét.', 'Prepares SMS draft in default Messaging app when scanned.')}
        </p>
      </div>
    </div>
  );
};
