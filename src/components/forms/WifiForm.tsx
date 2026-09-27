import React, { useState } from 'react';
import { useLanguage } from '../../i18n';
import { WifiData } from '../../types/qr';
import { Wifi, Eye, EyeOff, KeyRound, Shield } from 'lucide-react';

interface WifiFormProps {
  data: WifiData;
  onChange: (data: WifiData) => void;
}

export const WifiForm: React.FC<WifiFormProps> = ({ data, onChange }) => {
  const { tx } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);

  const generateSimplePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    onChange({ ...data, password: pass });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-neutral-400" />
          <span>{tx('Tên mạng (SSID)', 'Network Name (SSID)')}</span>
        </label>
        <input
          type="text"
          value={data.ssid}
          onChange={(e) => onChange({ ...data, ssid: e.target.value })}
          placeholder="e.g. Cafe_FreeWifi, Company_Guest"
          className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-lg text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors font-medium"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-neutral-400" />
            <span>Tiêu chuẩn bảo mật</span>
          </label>
          <select
            value={data.security}
            onChange={(e) =>
              onChange({
                ...data,
                security: e.target.value as WifiData['security'],
              })
            }
            className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-lg text-xs font-medium focus:outline-hidden focus:border-neutral-900 transition-colors cursor-pointer"
          >
            <option value="WPA">WPA / WPA2 / WPA3 (Khuyến nghị)</option>
            <option value="WEP">WEP (Tiêu chuẩn cũ)</option>
            <option value="nopass">Không có (Mạng công cộng)</option>
          </select>
        </div>

        {data.security !== 'nopass' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-neutral-400" />
                <span>{tx('Mật khẩu', 'Password')}</span>
              </label>
              <button
                type="button"
                onClick={generateSimplePassword}
                className="text-[10px] text-neutral-500 hover:text-neutral-900 cursor-pointer"
              >
                Tạo ngẫu nhiên
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={data.password}
                onChange={(e) => onChange({ ...data, password: e.target.value })}
                placeholder="Mật khẩu Wi-Fi"
                className="w-full h-10 pl-3 pr-9 bg-white text-neutral-900 border border-neutral-300 rounded-lg text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 p-1 text-neutral-400 hover:text-neutral-700 rounded cursor-pointer"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.hidden}
            onChange={(e) => onChange({ ...data, hidden: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-300 text-neutral-900"
          />
          <span className="text-xs font-medium text-neutral-700">
            Mạng ẩn (SSID không được phát)
          </span>
        </label>
      </div>

      <p className="text-xs text-neutral-500">
        Khi khách quét mã QR này, iOS và Android sẽ tự động kết nối mà không cần nhập mật khẩu.
      </p>
    </div>
  );
};
