import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import {
  QRDesignOptions,
  ErrorCorrectionLevel,
  ModuleStyle,
  EyeStyle,
  FrameStyle,
} from '../types/qr';
import {
  ChevronDown,
  SlidersHorizontal,
  Upload,
  X,
  Type,
  Grid,
  CircleDot,
  Check,
  Palette,
} from 'lucide-react';

interface CustomizePanelProps {
  design: QRDesignOptions;
  onChange: (design: QRDesignOptions) => void;
  isPaymentType?: boolean;
}

const COLOR_PRESETS = [
  { name: 'Monochrome', fg: '#000000', bg: '#ffffff', tag: '21:1 AAA' },
  { name: 'Espresso & Cream', fg: '#3b2219', bg: '#fdfbf7', tag: '13.8:1' },
  { name: 'Matcha Forest', fg: '#14422e', bg: '#f4f9f4', tag: '12.4:1' },
  { name: 'VietQR Marine', fg: '#003b73', bg: '#ffffff', tag: '11.2:1' },
  { name: 'Obsidian Warm', fg: '#111827', bg: '#fcfaf6', tag: '17.5:1' },
  { name: 'Bordeaux Wine', fg: '#4a0e17', bg: '#fffafa', tag: '14.9:1' },
  { name: 'Deep Indigo', fg: '#1e1b4b', bg: '#ffffff', tag: '16.1:1' },
  { name: 'Amber Roast', fg: '#78350f', bg: '#fffbeb', tag: '8.9:1' },
];

const FRAME_PRESETS = [
  'SCAN ME',
  'QUÉT MÃ',
  'QUÉT THANH TOÁN',
  'WIFI MIỄN PHÍ',
  'XEM MENU',
];

export const CustomizePanel: React.FC<CustomizePanelProps> = ({
  design,
  onChange,
  isPaymentType,
}) => {
  const { tx } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      onChange({
        ...design,
        centerLogo: 'custom',
        customLogoUrl: event.target?.result as string,
        errorCorrectionLevel:
          design.errorCorrectionLevel === 'L' || design.errorCorrectionLevel === 'M'
            ? 'H'
            : design.errorCorrectionLevel,
      });
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    onChange({
      ...design,
      centerLogo: 'none',
      customLogoUrl: null,
    });
  };

  const hasModifications =
    design.fgColor !== '#000000' ||
    design.bgColor !== '#ffffff' ||
    design.moduleStyle !== 'square' ||
    design.eyeStyle !== 'square' ||
    design.frameStyle !== 'none' ||
    design.centerLogo !== 'none' ||
    design.margin !== 2;

  return (
    <div className="border-t border-neutral-100 pt-4 mt-6">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 text-xs font-semibold text-neutral-800 uppercase tracking-wider hover:text-neutral-900 transition-colors cursor-pointer group"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 transition-colors" />
          <span>{tx('Tùy chỉnh & Khung', 'Styling & Frames')}</span>
          {hasModifications && (
            <span className="text-[10px] font-mono font-medium lowercase px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600">
              modified
            </span>
          )}
        </span>
        <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-normal normal-case">
          <span>{isOpen ? tx('Thu gọn', 'Collapse') : tx('Mở rộng', 'Expand')}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="pt-4 space-y-6 text-xs">
          {/* Module Dots Shape & Corner Eyes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Grid className="w-3 h-3 text-neutral-400" />
                <span>{tx('Kiểu điểm QR', 'Pattern Modules')}</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'square', label: tx('Cổ điển', 'Classic') },
                  { id: 'dots', label: tx('Bo tròn', 'Rounded') },
                  { id: 'squircle', label: tx('Bo mềm', 'Squircle') },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      onChange({ ...design, moduleStyle: m.id as ModuleStyle })
                    }
                    className={`py-1.5 px-2 rounded-lg border transition-all cursor-pointer ${
                      design.moduleStyle === m.id
                        ? 'border-neutral-900 bg-neutral-900 text-white font-medium shadow-xs'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CircleDot className="w-3 h-3 text-neutral-400" />
                <span>{tx('Góc định vị', 'Corner Eyes')}</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'square', label: tx('Vuông', 'Square') },
                  { id: 'rounded', label: tx('Bo tròn', 'Rounded') },
                  { id: 'circle', label: tx('Tròn', 'Circle') },
                ].map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() =>
                      onChange({ ...design, eyeStyle: e.id as EyeStyle })
                    }
                    className={`py-1.5 px-2 rounded-lg border transition-all cursor-pointer ${
                      design.eyeStyle === e.id
                        ? 'border-neutral-900 bg-neutral-900 text-white font-medium shadow-xs'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Call-to-action Frame */}
          <div className="p-3.5 bg-neutral-50/80 border border-neutral-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-3 h-3 text-neutral-400" />
                <span>{tx('Nội dung khung', 'Call-to-Action Caption')}</span>
              </label>
              {design.frameStyle !== 'none' && (
                <button
                  type="button"
                  onClick={() => onChange({ ...design, frameStyle: 'none' })}
                  className="text-[10px] text-neutral-400 hover:text-red-600 cursor-pointer"
                >
                  {tx('Xóa khung', 'Clear frame')}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'none', label: tx('Không có', 'None') },
                { id: 'bottom-bar', label: tx('Thanh dưới', 'Bottom Bar') },
                { id: 'top-bar', label: tx('Thanh trên', 'Top Bar') },
                { id: 'badge', label: tx('Nhãn viên thuốc', 'Pill Badge') },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...design,
                      frameStyle: f.id as FrameStyle,
                      frameText: design.frameText || 'SCAN ME',
                    })
                  }
                  className={`py-1.5 px-2 rounded-lg border transition-all cursor-pointer ${
                    design.frameStyle === f.id
                      ? 'border-neutral-900 bg-neutral-900 text-white font-medium shadow-xs'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {design.frameStyle !== 'none' && (
              <div className="pt-1 space-y-2">
                <input
                  type="text"
                  value={design.frameText}
                  onChange={(e) =>
                    onChange({ ...design, frameText: e.target.value })
                  }
                  placeholder="e.g. SCAN ME, QUÉT THANH TOÁN"
                  maxLength={30}
                  className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md font-medium focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 uppercase"
                />

                <div className="flex flex-wrap gap-1.5">
                  {FRAME_PRESETS.map((txt) => (
                    <button
                      key={txt}
                      type="button"
                      onClick={() => onChange({ ...design, frameText: txt })}
                      className="text-[10px] px-2 py-0.5 rounded bg-white hover:bg-neutral-200/80 border border-neutral-200 text-neutral-600 transition-colors"
                    >
                      {txt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Color Palette */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Palette className="w-3 h-3 text-neutral-400" />
              <span>{tx('Chủ đề màu', 'Color Themes')}</span>
            </label>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {COLOR_PRESETS.map((preset) => {
                const isActive =
                  design.fgColor === preset.fg && design.bgColor === preset.bg;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...design,
                        fgColor: preset.fg,
                        bgColor: preset.bg,
                      })
                    }
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      isActive
                        ? 'border-neutral-900 bg-neutral-900 text-white font-medium shadow-2xs'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: preset.fg }}
                    />
                    <span>{preset.name}</span>
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                        isActive
                          ? 'bg-neutral-800 text-neutral-300'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {preset.tag}
                    </span>
                    {isActive && <Check className="w-2.5 h-2.5 text-white ml-0.5" />}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[10px] text-neutral-500 mb-1">
                  Dots Color (Foreground)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={design.fgColor}
                    onChange={(e) =>
                      onChange({ ...design, fgColor: e.target.value })
                    }
                    className="w-8 h-8 rounded border border-neutral-300 p-0.5 cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={design.fgColor}
                    onChange={(e) =>
                      onChange({ ...design, fgColor: e.target.value })
                    }
                    className="w-full h-8 px-2 text-xs border border-neutral-300 rounded font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <span className="block text-[10px] text-neutral-500 mb-1">
                  Background
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={design.bgColor}
                    onChange={(e) =>
                      onChange({ ...design, bgColor: e.target.value })
                    }
                    className="w-8 h-8 rounded border border-neutral-300 p-0.5 cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={design.bgColor}
                    onChange={(e) =>
                      onChange({ ...design, bgColor: e.target.value })
                    }
                    className="w-full h-8 px-2 text-xs border border-neutral-300 rounded font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Margin & Error Correction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Quiet Margin
              </label>
              <div className="flex gap-1">
                {[0, 1, 2, 4].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onChange({ ...design, margin: m })}
                    className={`flex-1 py-1 text-xs font-mono rounded-md border transition-all cursor-pointer ${
                      design.margin === m
                        ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    {m === 0 ? 'None' : `${m}x`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Error Correction
              </label>
              <div className="flex gap-1">
                {(['L', 'M', 'Q', 'H'] as ErrorCorrectionLevel[]).map((level) => {
                  const labels: Record<ErrorCorrectionLevel, string> = {
                    L: 'L (7%)',
                    M: 'M (15%)',
                    Q: 'Q (25%)',
                    H: 'H (30%)',
                  };
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() =>
                        onChange({ ...design, errorCorrectionLevel: level })
                      }
                      className={`flex-1 py-1 text-xs font-mono rounded-md border transition-all cursor-pointer ${
                        design.errorCorrectionLevel === level
                          ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      {labels[level]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center Logo */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Center Emblem / Logo
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onChange({ ...design, centerLogo: 'none', customLogoUrl: null })
                }
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer ${
                  design.centerLogo === 'none'
                    ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                }`}
              >
                {tx('Không có', 'None')}
              </button>

              {isPaymentType && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...design,
                      centerLogo: 'bank',
                      errorCorrectionLevel: 'H',
                    })
                  }
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer ${
                    design.centerLogo === 'bank'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-900 font-semibold'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  VietQR Emblem
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...design,
                    centerLogo: 'wifi',
                    errorCorrectionLevel: 'H',
                  })
                }
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer ${
                  design.centerLogo === 'wifi'
                    ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                }`}
              >
                Wi-Fi Symbol
              </button>

              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...design,
                    centerLogo: 'link',
                    errorCorrectionLevel: 'H',
                  })
                }
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer ${
                  design.centerLogo === 'link'
                    ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                }`}
              >
                Link Symbol
              </button>

              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-dashed border-neutral-300 hover:border-neutral-500 bg-white text-neutral-700 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{tx('Tải tệp lên...', 'Upload file...')}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {design.centerLogo === 'custom' && design.customLogoUrl && (
                <div className="flex items-center gap-1 px-2 py-1 bg-neutral-100 rounded-md text-xs text-neutral-700">
                  <img
                    src={design.customLogoUrl}
                    alt="Custom logo"
                    className="w-4 h-4 object-contain rounded"
                  />
                  <span>{tx('Tệp tùy chỉnh', 'Custom file')}</span>
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="text-neutral-400 hover:text-red-600 ml-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
