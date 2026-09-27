import React from 'react';
import { useLanguage } from '../../i18n';
import { PhoneData } from '../../types/qr';

interface PhoneFormProps {
  data: PhoneData;
  onChange: (data: PhoneData) => void;
}

export const PhoneForm: React.FC<PhoneFormProps> = ({ data, onChange }) => {
  const { tx } = useLanguage();
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
          {tx('Số điện thoại', 'Phone Number')}
        </label>
        <input
          type="tel"
          value={data.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="e.g. +84 987 654 321 or 1900 1234"
          className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-mono"
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          {tx('Gọi trực tiếp khi quét trên thiết bị di động.', 'Dial directly when scanned on mobile devices.')}
        </p>
      </div>
    </div>
  );
};
