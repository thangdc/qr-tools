import React, { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { QRType, QRTemplate } from '../types/qr';
import { renderTemplatedQR } from '../utils/templateRenderer';
import {
  X,
  Printer,
  FileArchive,
  Layout,
  Scissors,
  Star,
  Sparkles,
  Utensils,
  Tag,
  CreditCard,
  LayoutTemplate,
  Info,
} from 'lucide-react';

export interface BatchPrintItem {
  id?: string;
  label: string;
  payload: string;
  type?: QRType;
  subtitle?: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
}

interface BatchCardPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BatchPrintItem[];
  templates: QRTemplate[];
  activeTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
}

export const BatchCardPrintModal: React.FC<BatchCardPrintModalProps> = ({
  isOpen,
  onClose,
  items,
  templates,
  activeTemplateId,
  onSelectTemplate,
}) => {
  const [selectedTmplId, setSelectedTmplId] = useState(activeTemplateId);
  const [printFormatMode, setPrintFormatMode] = useState<'card' | 'sticker'>('card');
  const [cardsPerPage, setCardsPerPage] = useState<2 | 4 | 6>(4);
  const [stickersPerPage, setStickersPerPage] = useState<9 | 12 | 16>(12);
  const [showCutLines, setShowCutLines] = useState(true);
  const [renderedCards, setRenderedCards] = useState<Record<string, string>>({});
  const [isRendering, setIsRendering] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // Synchronize with globally selected active template whenever print dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTmplId(activeTemplateId);
    }
  }, [isOpen, activeTemplateId]);

  const currentTemplate =
    templates.find((t) => t.id === selectedTmplId) || templates[0];

  // Render cards for all items using selected template
  useEffect(() => {
    if (!isOpen || items.length === 0 || !currentTemplate) return;

    let isMounted = true;
    setIsRendering(true);

    const renderAll = async () => {
      const cards: Record<string, string> = {};
      for (const item of items) {
        try {
          const offscreen = document.createElement('canvas');
          await renderTemplatedQR(
            offscreen,
            item.payload,
            printFormatMode === 'sticker'
              ? { ...currentTemplate, layout: 'bare' }
              : currentTemplate,
            {
              label: item.label,
              subtitle: item.subtitle,
              type: item.type,
              accountName: item.accountName,
              accountNumber: item.accountNumber,
              bankName: item.bankName,
            },
            printFormatMode === 'sticker' ? 360 : 600
          );
          cards[item.payload] = offscreen.toDataURL('image/png');
        } catch (e) {
          console.error(e);
        }
      }
      if (isMounted) {
        setRenderedCards(cards);
        setIsRendering(false);
      }
    };

    renderAll();

    return () => {
      isMounted = false;
    };
  }, [isOpen, items, currentTemplate, printFormatMode]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // ZIP export for all rendered cards
  const handleExportZip = async () => {
    if (items.length === 0) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder('printed-cards');

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const cardUrl = renderedCards[item.payload];
        if (!cardUrl) continue;

        const base64 = cardUrl.replace(/^data:image\/png;base64,/, '');
        const filename = `card_${i + 1}_${item.label.replace(/[^a-z0-9]/gi, '_')}.png`;
        folder?.file(filename, base64, { base64: true });
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-cards-batch-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden">
        {/* Top Control Bar - Hidden in print */}
        <div className="p-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 bg-white print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-neutral-900 text-white">
              <Printer className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-neutral-900">
                  Print Studio ({items.length} QR Codes Selected)
                </h2>
                {currentTemplate.isDefault && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200/60 flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-amber-500" />
                    <span>Default Template</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500">
                Choose between physical card stands or high-density adhesive sticker sheets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportZip}
              disabled={isZipping || isRendering}
              className="h-8 px-3 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-40"
              title="Download all cards as PNGs in a ZIP"
            >
              <FileArchive className="w-3.5 h-3.5 text-neutral-500" />
              <span>{isZipping ? 'Zipping...' : 'Export ZIP'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isRendering}
              className="h-8 px-4 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-40"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print All ({items.length})</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-md cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Primary Choice: Card Stands vs Adhesive Sticker Sheet */}
        <div className="p-3 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          {/* Format Mode Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-neutral-700 uppercase tracking-wider text-[11px]">
              Print Format:
            </span>
            <div className="flex p-0.5 bg-neutral-200/60 rounded-lg">
              <button
                type="button"
                onClick={() => setPrintFormatMode('card')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  printFormatMode === 'card'
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <LayoutTemplate className="w-3.5 h-3.5 text-blue-600" />
                <span>Card Stands & Tents</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintFormatMode('sticker')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  printFormatMode === 'sticker'
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>Adhesive Sticker Grid</span>
              </button>
            </div>
          </div>

          {/* Density & Scissors Guide Controls */}
          <div className="flex items-center gap-3">
            {printFormatMode === 'card' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500">Per A4 Page:</span>
                <div className="flex gap-1">
                  {[2, 4, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCardsPerPage(num as any)}
                      className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                        cardsPerPage === num
                          ? 'bg-neutral-900 text-white font-medium'
                          : 'bg-white border border-neutral-200 text-neutral-700'
                      }`}
                    >
                      {num} {num === 2 ? '(A5 Large)' : num === 4 ? '(A6 Card)' : '(Mini)'}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500">Stickers / Page:</span>
                <div className="flex gap-1">
                  {[9, 12, 16].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setStickersPerPage(num as any)}
                      className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                        stickersPerPage === num
                          ? 'bg-neutral-900 text-white font-medium'
                          : 'bg-white border border-neutral-200 text-neutral-700'
                      }`}
                    >
                      {num} ({num === 9 ? '3×3' : num === 12 ? '4×3' : '4×4'})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showCutLines}
                onChange={(e) => setShowCutLines(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-neutral-300 text-neutral-900"
              />
              <span className="text-neutral-600 flex items-center gap-1">
                <Scissors className="w-3 h-3" />
                <span>Cut guides</span>
              </span>
            </label>
          </div>
        </div>

        {/* Informational Explanation Strip (Clarifies the difference clearly!) */}
        <div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900 print:hidden">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            {printFormatMode === 'card' ? (
              <span>
                <strong>Card Stands Mode:</strong> Larger foldable physical cards (A5 or A6) for dining tables, acrylic counter stands, or reception desks with headers, descriptions, & Wi-Fi details.
              </span>
            ) : (
              <span>
                <strong>Sticker Grid Mode:</strong> High-density peel-and-stick labels (9, 12, or 16 per A4 sheet) for disposable coffee cups, takeaway boxes, packaging, or product labels.
              </span>
            )}
          </div>

          {printFormatMode === 'card' && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] text-neutral-500">Template:</span>
              <select
                value={selectedTmplId}
                onChange={(e) => {
                  setSelectedTmplId(e.target.value);
                  onSelectTemplate(e.target.value);
                }}
                className="h-7 px-2 bg-white border border-neutral-300 rounded text-xs font-medium cursor-pointer"
              >
                {templates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name} {tmpl.isDefault ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Printable Canvas Sheet Viewport */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-neutral-100 print:bg-white print:p-0">
          <div className="max-w-[210mm] mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-sm print:shadow-none print:p-0">
            {isRendering ? (
              <div className="p-12 text-center text-xs text-neutral-400">
                Rendering {items.length} QR items...
              </div>
            ) : printFormatMode === 'card' ? (
              /* Card Stands Layout */
              <div
                className={`grid gap-4 sm:gap-6 print:gap-4 ${
                  cardsPerPage === 2
                    ? 'grid-cols-1 sm:grid-cols-2 print:grid-cols-2'
                    : cardsPerPage === 4
                    ? 'grid-cols-1 sm:grid-cols-2 print:grid-cols-2'
                    : 'grid-cols-2 sm:grid-cols-3 print:grid-cols-3'
                }`}
              >
                {items.map((item, idx) => {
                  const cardImgUrl = renderedCards[item.payload];

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col items-center justify-center p-3 bg-white rounded-xl break-inside-avoid relative ${
                        showCutLines
                          ? 'border border-dashed border-neutral-300'
                          : 'border border-neutral-200'
                      }`}
                    >
                      {cardImgUrl ? (
                        <img
                          src={cardImgUrl}
                          alt={item.label}
                          className="w-full h-auto max-w-[320px] object-contain rounded-lg shadow-2xs"
                        />
                      ) : (
                        <div className="w-48 h-60 bg-neutral-100 animate-pulse rounded-lg" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* High-Density Adhesive Sticker Grid Layout */
              <div
                className={`grid gap-3 print:gap-2 ${
                  stickersPerPage === 9
                    ? 'grid-cols-3 print:grid-cols-3'
                    : stickersPerPage === 12
                    ? 'grid-cols-3 sm:grid-cols-4 print:grid-cols-4'
                    : 'grid-cols-4 print:grid-cols-4'
                }`}
              >
                {items.map((item, idx) => {
                  const cardImgUrl = renderedCards[item.payload];

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col items-center justify-center p-3 bg-white rounded-lg text-center break-inside-avoid relative ${
                        showCutLines
                          ? 'border border-dashed border-neutral-300'
                          : 'border border-neutral-200'
                      }`}
                    >
                      {cardImgUrl ? (
                        <img
                          src={cardImgUrl}
                          alt={item.label}
                          className="w-24 h-24 sm:w-28 sm:h-28 object-contain mb-1.5"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-neutral-100 animate-pulse rounded mb-1.5" />
                      )}
                      <span className="text-[11px] font-bold text-neutral-900 line-clamp-1">
                        {item.label}
                      </span>
                      <span className="text-[9px] text-neutral-400 font-mono uppercase">
                        {item.type || 'QR'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
