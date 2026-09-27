import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { PaymentData } from '../../types/qr';
import { VIETNAM_BANKS, removeVietnameseAccents } from '../../utils/vietqr';
import { ShieldCheck, Search, ChevronDown, Check } from 'lucide-react';

interface PaymentFormProps {
  data: PaymentData;
  onChange: (data: PaymentData) => void;
}

const QUICK_AMOUNTS = [
  { label: '50.000đ', value: '50000' },
  { label: '100.000đ', value: '100000' },
  { label: '200.000đ', value: '200000' },
  { label: '500.000đ', value: '500000' },
  { label: '1.000.000đ', value: '1000000' },
];

export const PaymentForm: React.FC<PaymentFormProps> = ({ data, onChange }) => {
  const { tx } = useLanguage();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedBank = useMemo(() => {
    if (data.bankName) {
      const foundByName = VIETNAM_BANKS.find(
        (b) =>
          b.shortName.toLowerCase() === data.bankName.toLowerCase() ||
          b.code.toLowerCase() === data.bankName.toLowerCase()
      );
      if (foundByName) return foundByName;
    }
    return (
      VIETNAM_BANKS.find((b) => b.bin === data.bankBin) || VIETNAM_BANKS[0]
    );
  }, [data.bankBin, data.bankName]);

  const filteredBanks = useMemo(() => {
    const q = bankSearch.toLowerCase().trim();
    if (!q) return VIETNAM_BANKS;
    return VIETNAM_BANKS.filter(
      (b) =>
        b.shortName.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.bin.includes(q)
    );
  }, [bankSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectBank = (bank: (typeof VIETNAM_BANKS)[number]) => {
    onChange({
      ...data,
      bankBin: bank.bin,
      bankName: bank.shortName,
    });
    setIsDropdownOpen(false);
    setBankSearch('');
  };

  const handleAccountNameChange = (val: string) => {
    const sanitized = removeVietnameseAccents(val).toUpperCase();
    onChange({
      ...data,
      accountName: sanitized,
    });
  };

  const handleAmountChange = (val: string) => {
    const cleanNum = val.replace(/\D/g, '');
    onChange({
      ...data,
      amount: cleanNum,
    });
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider">
          Ngân hàng thụ hưởng (VietQR Napas 247)
        </label>
        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{tx('40+ ngân hàng', '40+ Ngân hàng')}</span>
        </span>
      </div>

      {/* Searchable Bank Combobox */}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm font-medium flex items-center justify-between focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2 truncate">
            <span
              className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: selectedBank.logoBg }}
            >
              {selectedBank.code.slice(0, 3)}
            </span>
            <span className="font-semibold text-neutral-900">
              {selectedBank.shortName}
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              ({selectedBank.code})
            </span>
            <span className="text-xs text-neutral-500 truncate hidden sm:inline">
              — {selectedBank.name}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0 ml-2" />
        </button>

        {isDropdownOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 border-b border-neutral-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                placeholder="Tìm theo mã hoặc tên ngân hàng (VCB, TCB, MB, Timo, Cake...)"
                className="w-full text-xs outline-none bg-transparent placeholder:text-neutral-400"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-neutral-50">
              {filteredBanks.length === 0 ? (
                <div className="p-3 text-center text-xs text-neutral-400">
                  Không tìm thấy ngân hàng phù hợp
                </div>
              ) : (
                filteredBanks.map((b) => {
                  const isSelected = selectedBank.code === b.code;
                  return (
                    <button
                      key={b.code}
                      type="button"
                      onClick={() => handleSelectBank(b)}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-neutral-50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/70 font-semibold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span
                          className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                          style={{ backgroundColor: b.logoBg }}
                        >
                          {b.code.slice(0, 3)}
                        </span>
                        <span className="font-semibold text-neutral-900">
                          {b.shortName}
                        </span>
                        <span className="text-neutral-400 font-mono">
                          ({b.code})
                        </span>
                        <span className="text-neutral-500 truncate hidden sm:inline">
                          — {b.name}
                        </span>
                      </div>

                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
            Số tài khoản
          </label>
          <input
            type="text"
            value={data.accountNumber}
            onChange={(e) =>
              onChange({
                ...data,
                accountNumber: e.target.value.replace(/\s+/g, ''),
              })
            }
            placeholder="0123456789"
            className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-mono font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
            Tên chủ tài khoản
          </label>
          <input
            type="text"
            value={data.accountName}
            onChange={(e) => handleAccountNameChange(e.target.value)}
            placeholder="NGUYEN VAN A"
            className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors uppercase font-medium"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider">
            Số tiền (VNĐ) <span className="text-neutral-400 font-normal">· Tùy chọn</span>
          </label>
          {data.amount && Number(data.amount) > 0 && (
            <span className="text-xs font-semibold text-neutral-900 font-mono tabular-nums">
              {Number(data.amount).toLocaleString('vi-VN')} ₫
            </span>
          )}
        </div>
        <input
          type="text"
          value={
            data.amount
              ? Number(data.amount).toLocaleString('vi-VN')
              : ''
          }
          onChange={(e) => handleAmountChange(e.target.value)}
          placeholder="Để trống nếu người chuyển tự nhập số tiền"
          className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-mono"
        />

        {/* Quick Amount Pills */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {QUICK_AMOUNTS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange({ ...data, amount: item.value })}
              className={`text-xs px-2.5 py-1 rounded transition-colors cursor-pointer ${
                data.amount === item.value
                  ? 'bg-neutral-900 text-white font-medium'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              {item.label}
            </button>
          ))}
          {data.amount && (
            <button
              type="button"
              onClick={() => onChange({ ...data, amount: '' })}
              className="text-xs px-2 py-1 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
            >
              Xóa
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
          Nội dung chuyển khoản
        </label>
        <input
          type="text"
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="e.g. Thanh toan hoa don, Ung ho, Mua hang..."
          maxLength={50}
          className="w-full h-10 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-md text-sm placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          Tự động sinh chuỗi thanh toán chuẩn Napas 247. Mọi ứng dụng ngân hàng tại Việt Nam quét thanh toán tức thì.
        </p>
      </div>
    </div>
  );
};
