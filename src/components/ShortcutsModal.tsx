import React from 'react';
import { useLanguage } from '../i18n';
import { X, Command, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = (tx: (vi: string, en: string) => string) => [
  { keys: ['⌘ / Ctrl', 'S'], description: tx('Tải PNG độ phân giải cao (1024px)', 'Download High-Resolution PNG (1024px)') },
  { keys: ['⌘ / Ctrl', 'C'], description: tx('Sao chép ảnh PNG vào bộ nhớ tạm', 'Copy PNG Image to Clipboard') },
  { keys: ['⌘ / Ctrl', 'Shift', 'C'], description: tx('Sao chép mã SVG vector (cho Figma / Illustrator)', 'Copy Vector SVG Code (for Figma / Illustrator)') },
  { keys: ['⌘ / Ctrl', 'P'], description: tx('Mở xem trước khi in', 'Open Print Preview') },
  { keys: ['1', '–', '9'], description: tx('Chuyển nhanh loại QR (URL, Văn bản, Liên hệ, Wi-Fi...)', 'Quick-switch QR Type (URL, Text, Contact, WiFi, etc.)') },
  { keys: ['?'], description: tx('Bật/tắt bảng phím tắt', 'Toggle this Keyboard Shortcuts cheatsheet') },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const { tx } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-lg border border-neutral-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-neutral-100 text-neutral-800">
              <Keyboard className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-semibold text-neutral-900">
              {tx('Phím tắt', 'Keyboard Shortcuts')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 text-xs divide-y divide-neutral-100">
          {SHORTCUTS(tx).map((s, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
              <span className="text-neutral-600">{s.description}</span>
              <div className="flex items-center gap-1 shrink-0 ml-3">
                {s.keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded font-mono text-[11px] text-neutral-800 shadow-2xs"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-neutral-50 border-t border-neutral-100 text-center">
          <span className="text-[11px] text-neutral-400">
            {tx('Nhấn ', 'Press ')}<kbd className="px-1 bg-white border border-neutral-200 rounded font-mono">Esc</kbd> {tx(' bất kỳ lúc nào để đóng', ' anytime to close')}
          </span>
        </div>
      </div>
    </div>
  );
};
