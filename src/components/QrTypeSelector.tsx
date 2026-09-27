import React, { useRef } from 'react';
import { QRType } from '../types/qr';
import {
  Link2,
  FileText,
  User,
  Wifi,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  CreditCard,
  Calendar,
} from 'lucide-react';

interface QrTypeSelectorProps {
  selectedType: QRType;
  onSelectType: (type: QRType) => void;
}

interface TypeItem {
  id: QRType;
  label: string;
  sublabel: string;
  shortcut: string;
  icon: React.ElementType;
}

const QR_TYPES: TypeItem[] = [
  { id: 'url', label: 'URL', sublabel: 'Link', shortcut: '1', icon: Link2 },
  { id: 'payment', label: 'VietQR', sublabel: 'Napas 247', shortcut: '2', icon: CreditCard },
  { id: 'wifi', label: 'WiFi', sublabel: 'Mạng', shortcut: '3', icon: Wifi },
  { id: 'contact', label: 'Contact', sublabel: 'vCard', shortcut: '4', icon: User },
  { id: 'text', label: 'Text', sublabel: 'Ghi chú', shortcut: '5', icon: FileText },
  { id: 'email', label: 'Email', sublabel: 'Thư', shortcut: '6', icon: Mail },
  { id: 'phone', label: 'Phone', sublabel: 'Gọi', shortcut: '7', icon: Phone },
  { id: 'sms', label: 'SMS', sublabel: 'Tin nhắn', shortcut: '8', icon: MessageSquare },
  { id: 'location', label: 'Location', sublabel: 'Bản đồ', shortcut: '9', icon: MapPin },
  { id: 'event', label: 'Event', sublabel: 'Lịch hẹn', shortcut: '0', icon: Calendar },
];

export const QrTypeSelector: React.FC<QrTypeSelectorProps> = ({
  selectedType,
  onSelectType,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        role="tablist"
        aria-label="QR Code Type Selection"
        className="flex items-center gap-1 p-1 bg-neutral-100/90 rounded-xl overflow-x-auto scrollbar-none border border-neutral-200/60"
      >
        {QR_TYPES.map((t) => {
          const isSelected = selectedType === t.id;
          const Icon = t.icon;

          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelectType(t.id)}
              className={`group relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neutral-900 ${
                isSelected
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/50'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                  isSelected
                    ? t.id === 'payment'
                      ? 'text-emerald-600'
                      : 'text-neutral-900'
                    : 'text-neutral-400 group-hover:text-neutral-600'
                }`}
              />
              <span>{t.label}</span>

              {t.id === 'payment' && (
                <span className="text-[9px] font-mono font-semibold px-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  VN
                </span>
              )}

              <span className="hidden sm:inline text-[9px] font-mono text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
                {t.shortcut}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
