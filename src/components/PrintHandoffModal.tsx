import React, { useState } from 'react';
import { QRDesignOptions } from '../types/qr';
import { renderCustomQRCode } from '../utils/qrRenderer';
import { X, Ruler, Download, Printer, Check } from 'lucide-react';

interface PrintHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: string;
  design: QRDesignOptions;
}

const PRESET_SIZES = [
  { name: 'Business Card', mm: 25, useCase: 'Danh thiếp / Thẻ nhân viên' },
  { name: 'Standard Sticker', mm: 40, useCase: 'Tem dán ly / Bao bì' },
  { name: 'Table Stand / Coaster', mm: 60, useCase: 'Bàn ăn / Đế lót ly' },
  { name: 'Counter Sign', mm: 100, useCase: 'Quầy thu ngân / Bảng mica' },
  { name: 'Large Poster', mm: 150, useCase: 'Áp phích cửa kính' },
];

export const PrintHandoffModal: React.FC<PrintHandoffModalProps> = ({
  isOpen,
  onClose,
  payload,
  design,
}) => {
  const [selectedMm, setSelectedMm] = useState<number>(60);
  const [customMm, setCustomMm] = useState<string>('60');
  const [addCropMarks, setAddCropMarks] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  // 300 DPI conversion: 1 inch = 25.4 mm => pixels = (mm / 25.4) * 300
  const targetPixels = Math.round((selectedMm / 25.4) * 300);

  const handleDownloadMetricPNG = async () => {
    if (!payload) return;
    setIsExporting(true);

    try {
      const padding = addCropMarks ? Math.round(targetPixels * 0.12) : 0;
      const totalWidth = targetPixels + padding * 2;

      const canvas = document.createElement('canvas');
      canvas.width = totalWidth;
      canvas.height = totalWidth;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = design.bgColor;
      ctx.fillRect(0, 0, totalWidth, totalWidth);

      // Render QR
      const qrCanvas = document.createElement('canvas');
      await renderCustomQRCode(qrCanvas, payload, design, targetPixels);

      ctx.drawImage(qrCanvas, padding, padding, targetPixels, targetPixels);

      // Draw Crop Marks if enabled
      if (addCropMarks) {
        ctx.strokeStyle = '#999999';
        ctx.lineWidth = 1;
        const markLen = Math.round(padding * 0.4);

        // Top-left
        ctx.beginPath();
        ctx.moveTo(padding - markLen, padding);
        ctx.lineTo(padding, padding);
        ctx.moveTo(padding, padding - markLen);
        ctx.lineTo(padding, padding);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(padding + targetPixels, padding);
        ctx.lineTo(padding + targetPixels + markLen, padding);
        ctx.moveTo(padding + targetPixels, padding - markLen);
        ctx.lineTo(padding + targetPixels, padding);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(padding - markLen, padding + targetPixels);
        ctx.lineTo(padding, padding + targetPixels);
        ctx.moveTo(padding, padding + targetPixels);
        ctx.lineTo(padding, padding + targetPixels + markLen);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(padding + targetPixels, padding + targetPixels);
        ctx.lineTo(padding + targetPixels + markLen, padding + targetPixels);
        ctx.moveTo(padding + targetPixels, padding + targetPixels);
        ctx.lineTo(padding + targetPixels, padding + targetPixels + markLen);
        ctx.stroke();
      }

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-print-${selectedMm}mm-300dpi.png`;
      a.click();
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
                Print Handoff & Millimeter Sizing
              </h2>
              <p className="text-[11px] text-neutral-400">
                Commercial 300 DPI calibrated output with optional crop marks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-2">
              Physical Print Dimension
            </label>
            <div className="space-y-1.5">
              {PRESET_SIZES.map((preset) => (
                <button
                  key={preset.mm}
                  type="button"
                  onClick={() => {
                    setSelectedMm(preset.mm);
                    setCustomMm(preset.mm.toString());
                  }}
                  className={`w-full p-2.5 rounded border text-left flex items-center justify-between transition-colors cursor-pointer ${
                    selectedMm === preset.mm
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
              Custom mm:
            </label>
            <input
              type="number"
              min={10}
              max={500}
              value={customMm}
              onChange={(e) => {
                setCustomMm(e.target.value);
                const n = parseInt(e.target.value, 10);
                if (n > 0) setSelectedMm(n);
              }}
              className="w-24 h-8 px-2 border border-neutral-300 rounded text-xs font-mono"
            />
            <span className="text-xs text-neutral-400">mm width</span>
          </div>

          {/* Resolution specs summary */}
          <div className="p-3 bg-neutral-50 rounded border border-neutral-200 space-y-1 font-mono text-[11px] text-neutral-600">
            <div className="flex justify-between">
              <span>Resolution:</span>
              <span className="font-semibold text-neutral-900">
                {targetPixels} × {targetPixels} px
              </span>
            </div>
            <div className="flex justify-between">
              <span>Print Standard:</span>
              <span className="font-semibold text-emerald-700">300 DPI (Offset Grade)</span>
            </div>
            <div className="flex justify-between">
              <span>Physical Size:</span>
              <span>{selectedMm} × {selectedMm} mm</span>
            </div>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={addCropMarks}
                onChange={(e) => setAddCropMarks(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-blue-600"
              />
              <span className="text-xs font-medium text-neutral-700">
                Add printer crop marks (Góc xén thành phẩm)
              </span>
            </label>
          </div>
        </div>

        <div className="p-3.5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadMetricPNG}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating...' : `Export ${selectedMm}mm (300 DPI)`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
