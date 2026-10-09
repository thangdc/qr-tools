import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import { QRTemplate, QROutputSettings } from '../types/qr';
import { QRRenderingService } from '../services/qrRenderingService';
import { X, Ruler, Download } from 'lucide-react';

interface PrintHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: string;
  template: QRTemplate;
  outputSettings: QROutputSettings;
  onOutputSettingsChange: (settings: QROutputSettings) => void;
  isPro: boolean;
  onOpenPro: (source?: string) => void;
}

const PRESET_SIZES = [
  { name: 'Business Card', mm: 25, useCase: 'Danh thiếp / Thẻ nhân viên' },
  { name: 'Standard Sticker', mm: 40, useCase: 'Tem dán ly / Bao bì' },
  { name: 'Table Stand / Coaster', mm: 60, useCase: 'Bàn ăn / Đế lót ly' },
  { name: 'Counter Sign', mm: 100, useCase: 'Quầy thu ngân / Bảng mica' },
  { name: 'Large Poster', mm: 150, useCase: 'Áp phích cửa kính' },
];

const IMAGE_SIZES = [512, 1024, 2048] as const;

export const PrintHandoffModal: React.FC<PrintHandoffModalProps> = ({
  isOpen,
  onClose,
  payload,
  template,
  outputSettings,
  onOutputSettingsChange,
  isPro,
  onOpenPro,
}) => {
  const { tx } = useLanguage();
  const [customMm, setCustomMm] = useState<string>(String(outputSettings.printSizeMm));
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const targetPixels = Math.round(
    (outputSettings.printSizeMm / 25.4) * outputSettings.dpi
  );

  const update = (patch: Partial<QROutputSettings>) => {
    onOutputSettingsChange({ ...outputSettings, ...patch });
  };

  const handleImageSizeChange = (imageSize: QROutputSettings['imageSize']) => {
    if (imageSize >= 2048 && !isPro) {
      onOpenPro('single_download_2048');
      return;
    }
    update({ imageSize });
  };

  const handleDownloadMetricPNG = async () => {
    if (!payload) return;
    if (!isPro) {
      onOpenPro('metric_export');
      return;
    }

    setIsExporting(true);

    try {
      const padding = outputSettings.addCropMarks ? Math.round(targetPixels * 0.12) : 0;
      const canvas = document.createElement('canvas');

      // The same centralized renderer is used for preview, PNG output and print.
      await QRRenderingService.renderToCanvas(
        canvas,
        payload,
        template,
        {},
        targetPixels
      );

      if (padding > 0) {
        const padded = document.createElement('canvas');
        padded.width = canvas.width + padding * 2;
        padded.height = canvas.height + padding * 2;
        const ctx = padded.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = template.design.bgColor;
        ctx.fillRect(0, 0, padded.width, padded.height);
        ctx.drawImage(canvas, padding, padding);

        ctx.strokeStyle = '#999999';
        ctx.lineWidth = 1;
        const markLen = Math.round(padding * 0.4);
        const right = padded.width - padding;
        const bottom = padded.height - padding;

        ctx.beginPath();
        ctx.moveTo(padding - markLen, padding);
        ctx.lineTo(padding, padding);
        ctx.moveTo(padding, padding - markLen);
        ctx.lineTo(padding, padding);
        ctx.moveTo(right, padding);
        ctx.lineTo(right + markLen, padding);
        ctx.moveTo(right, padding - markLen);
        ctx.lineTo(right, padding);
        ctx.moveTo(padding - markLen, bottom);
        ctx.lineTo(padding, bottom);
        ctx.moveTo(padding, bottom);
        ctx.lineTo(padding, bottom + markLen);
        ctx.moveTo(right, bottom);
        ctx.lineTo(right + markLen, bottom);
        ctx.moveTo(right, bottom);
        ctx.lineTo(right, bottom + markLen);
        ctx.stroke();

        const url = padded.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-print-${outputSettings.printSizeMm}mm-${outputSettings.dpi}dpi.png`;
        a.click();
      } else {
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-print-${outputSettings.printSizeMm}mm-${outputSettings.dpi}dpi.png`;
        a.click();
      }

      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-lg border border-neutral-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-blue-50 text-blue-600">
              <Ruler className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                {tx('Thiết lập đầu ra', 'Output Settings')}
              </h2>
              <p className="text-[11px] text-neutral-400">
                {tx('Một cấu hình dùng chung cho ảnh, copy và in', 'One shared configuration for image, copy and print output')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 p-1 rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider">
                {tx('Kích thước ảnh', 'Image Size')}
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {IMAGE_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleImageSizeChange(size)}
                  className={`p-2.5 rounded border text-center transition-colors cursor-pointer ${
                    outputSettings.imageSize === size
                      ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                  }`}
                >
                  <span>{size} × {size}</span>
                  {size === 2048 && !isPro && <span className={`ml-1 rounded px-1 py-0.5 text-[9px] font-bold ${outputSettings.imageSize === size ? 'bg-white/15 text-white' : 'bg-amber-100 text-amber-800'}`}>PRO</span>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-2">
              {tx('Kích thước in thực tế', 'Physical Print Size')}
            </label>
            <div className="space-y-1.5">
              {PRESET_SIZES.map((preset) => (
                <button
                  key={preset.mm}
                  type="button"
                  onClick={() => {
                    setCustomMm(String(preset.mm));
                    update({ printSizeMm: preset.mm });
                  }}
                  className={`w-full p-2.5 rounded border text-left flex items-center justify-between transition-colors cursor-pointer ${
                    outputSettings.printSizeMm === preset.mm
                      ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                  }`}
                >
                  <div>
                    <span className="font-semibold">{preset.name}</span>
                    <span className="text-[11px] opacity-75 ml-2 font-mono">
                      {preset.mm} × {preset.mm} mm
                    </span>
                  </div>
                  <span className="text-[10px] opacity-80">{preset.useCase}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <label className="text-xs text-neutral-600 font-medium">
              {tx('Kích thước tùy chỉnh (mm):', 'Custom mm:')}
            </label>
            <input
              type="number"
              min={10}
              max={500}
              value={customMm}
              onChange={(e) => {
                setCustomMm(e.target.value);
                const n = Number(e.target.value);
                if (n >= 10 && n <= 500) update({ printSizeMm: n });
              }}
              className="w-24 h-8 px-2 border border-neutral-300 rounded text-xs font-mono"
            />
            <span className="text-xs text-neutral-400">{tx('chiều rộng', 'width')}</span>
          </div>

          <div className="p-3 bg-neutral-50 rounded border border-neutral-200 space-y-1 font-mono text-[11px] text-neutral-600">
            <div className="flex justify-between">
              <span>{tx('Kích thước ảnh:', 'Image Size:')}</span>
              <span className="font-semibold text-neutral-900">
                {outputSettings.imageSize} × {outputSettings.imageSize} px
              </span>
            </div>
            <div className="flex justify-between">
              <span>{tx('Tiêu chuẩn in:', 'Print Standard:')}</span>
              <span className="font-semibold text-emerald-700">{outputSettings.dpi} DPI</span>
            </div>
            <div className="flex justify-between">
              <span>{tx('Kích thước thực:', 'Physical Size:')}</span>
              <span>{outputSettings.printSizeMm} × {outputSettings.printSizeMm} mm</span>
            </div>
            <div className="flex justify-between">
              <span>{tx('300 DPI cần:', 'Pixels needed at 300 DPI:')}</span>
              <span className="font-semibold text-neutral-900">{targetPixels} px</span>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={outputSettings.addCropMarks}
              onChange={(e) => update({ addCropMarks: e.target.checked })}
              className="w-4 h-4 rounded border-neutral-300 text-blue-600"
            />
            <span className="text-xs font-medium text-neutral-700">
              {tx('Thêm dấu xén thành phẩm', 'Add printer crop marks')}
            </span>
          </label>

          <p className="text-[10px] text-neutral-400 leading-relaxed">
            {tx(
              'SVG là vector nên không phụ thuộc vào DPI. PNG dùng kích thước ảnh đã chọn; xuất 300 DPI tính theo kích thước in thực tế.',
              'SVG is vector and does not depend on DPI. PNG uses the selected image size; 300 DPI output is calculated from the physical print size.'
            )}
          </p>
        </div>

        <div className="p-3.5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer">
            {tx('Đóng', 'Close')}
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadMetricPNG}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {isExporting
                ? tx('Đang tạo...', 'Generating...')
                : tx(`Xuất ${outputSettings.printSizeMm}mm (${outputSettings.dpi} DPI)`, `Export ${outputSettings.printSizeMm}mm (${outputSettings.dpi} DPI)`)}
              {!isPro && <span className="rounded bg-white/15 px-1 py-0.5 text-[9px] font-bold">PRO</span>}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
