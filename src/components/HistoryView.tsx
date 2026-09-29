import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n';
import { QRHistoryItem, QRType, QRTemplate, QROutputSettings, DEFAULT_QR_OUTPUT_SETTINGS, BulkQRItem } from '../types/qr';
import { PREDEFINED_TEMPLATES } from '../utils/defaultTemplates';
import { renderTemplatedQR } from '../utils/templateRenderer';
import { Search, RotateCcw, Download, Printer, Trash2, ArrowLeft, Upload, CheckSquare, Square, FileDown } from 'lucide-react';
import { ImportHistoryPanel } from './ImportHistoryPanel';

interface HistoryViewProps {
  items: QRHistoryItem[];
  onRestore: (item: QRHistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onBackToGenerator: () => void;
  isPro: boolean;
  onOpenPro: (source?: string) => void;
  onImport: (items: BulkQRItem[]) => void;
  onBatchPrint: (items: QRHistoryItem[]) => void;
}

const FILTER_TYPES: { label: string; value: 'all' | QRType }[] = [
  { label: 'All', value: 'all' },
  { label: 'URL', value: 'url' },
  { label: 'VietQR', value: 'payment' },
  { label: 'WiFi', value: 'wifi' },
  { label: 'Contact', value: 'contact' },
  { label: 'Text', value: 'text' },
];

function readOutputSettings(): QROutputSettings {
  try {
    const stored = localStorage.getItem('qr_tools_output_settings');
    return stored ? { ...DEFAULT_QR_OUTPUT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_QR_OUTPUT_SETTINGS;
  } catch {
    return DEFAULT_QR_OUTPUT_SETTINGS;
  }
}

function readTemplate(item: QRHistoryItem): QRTemplate {
  try {
    const stored = localStorage.getItem('qr_tools_templates');
    const templates: QRTemplate[] = stored ? JSON.parse(stored) : PREDEFINED_TEMPLATES;
    const base = templates.find((t) => t.id === item.templateId) || templates.find((t) => t.isDefault) || templates[0] || PREDEFINED_TEMPLATES[0];
    return {
      ...base,
      design: item.design || base.design,
      frameStyle: item.design?.frameStyle || base.frameStyle,
      frameText: item.design?.frameText || base.frameText,
    };
  } catch {
    return { ...PREDEFINED_TEMPLATES[0], design: item.design || PREDEFINED_TEMPLATES[0].design };
  }
}

function getRenderExtra(item: QRHistoryItem) {
  const data = item.data || {};
  return {
    label: item.title,
    subtitle: item.subtitle,
    type: item.type,
    wifiSsid: data.ssid,
    wifiPass: data.password,
    bankName: data.bankName,
    accountNumber: data.accountNumber,
    accountName: data.accountName,
    amount: data.amount,
  };
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  items,
  onRestore,
  onDelete,
  onClearAll,
  onBackToGenerator,
  isPro,
  onOpenPro,
  onImport,
  onBatchPrint,
}) => {
  const { tx } = useLanguage();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | QRType>('all');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredItems = useMemo(() => items.filter((item) => {
    const matchType = filterType === 'all' || item.type === filterType;
    const q = search.toLowerCase().trim();
    const matchSearch = !q || item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q) || item.rawPayload.toLowerCase().includes(q);
    return matchType && matchSearch;
  }), [items, filterType, search]);

  const selectedItems = filteredItems.filter((item) => selectedIds.has(item.id));
  const allVisibleSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id));

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredItems.forEach((item) => next.delete(item.id));
      } else {
        filteredItems.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const handleExportCsv = () => {
    if (!selectedItems.length) return;
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      'Label,Type,Payload,Created At',
      ...selectedItems.map((item) =>
        [item.title, item.type, item.rawPayload, new Date(item.createdAt).toISOString()]
          .map(escapeCsv)
          .join(',')
      ),
    ].join('\\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-history-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderHistoryItem = async (item: QRHistoryItem) => {
    const settings = readOutputSettings();
    const isPro = localStorage.getItem('qr_tools_pro') === 'true';
    const imageSize = settings.imageSize === 2048 && !isPro ? 1024 : settings.imageSize;
    const canvas = document.createElement('canvas');
    await renderTemplatedQR(canvas, item.rawPayload, readTemplate(item), getRenderExtra(item), imageSize);
    return canvas;
  };

  const handleDownload = async (item: QRHistoryItem) => {
    const canvas = await renderHistoryItem(item);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `qr-${item.type}-${item.id}.png`;
    link.click();
  };

  const handlePrint = async (item: QRHistoryItem) => {
    const canvas = await renderHistoryItem(item);
    const settings = readOutputSettings();
    // Open the print document synchronously from the user click so popup blockers
    // do not treat it as a delayed window.open after async QR rendering.
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return;
    }

    const image = canvas.toDataURL('image/png');
    const width = Math.max(10, settings.printSizeMm);
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><title>Print QR</title><style>@page{size:auto;margin:0}html,body{margin:0;padding:0}body{margin:0;padding:0;display:flex;justify-content:center;align-items:center;min-height:100vh}img{width:${width}mm;height:auto;display:block}</style></head><body><img id="qr-print-image" src="${image}" alt="QR Code"></body></html>`);
    printWindow.document.close();

    const printImage = printWindow.document.getElementById('qr-print-image') as HTMLImageElement | null;
    const print = () => {
      printWindow.focus();
      printWindow.print();
    };

    if (printImage?.complete) {
      setTimeout(print, 50);
    } else {
      printImage?.addEventListener('load', print, { once: true });
      setTimeout(print, 500);
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <button type="button" onClick={onBackToGenerator} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 mb-2 cursor-pointer transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{tx('Quay lại trình tạo', 'Back to Generator')}</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">{tx('Lịch sử', 'History')}</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">{tx('Quản lý các mã QR bạn đã lưu. Tải xuống hoặc in trực tiếp từ đây.', 'Manage your saved QR codes. Download or print directly from here.')}</p>
        </div>
        {items.length > 0 && <button type="button" onClick={onClearAll} className="h-8 px-2.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer">{tx('Xóa tất cả', 'Clear all')}</button>}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tx('Tìm trong lịch sử...', 'Search history...')} className="w-full h-9 pl-9 pr-3 text-xs sm:text-sm bg-white border border-neutral-300 rounded-md placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button type="button" onClick={toggleAllVisible} disabled={!filteredItems.length} className="h-8 px-2.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shrink-0">{allVisibleSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}<span>{tx('Chọn tất cả','Select all')}</span></button>{FILTER_TYPES.map((ft) => <button key={ft.value} type="button" onClick={() => setFilterType(ft.value)} className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${filterType === ft.value ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200/70'}`}>{ft.label}</button>)}
          {selectedItems.length > 0 && <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <span className="text-xs text-neutral-500">{selectedItems.length} {tx('đã chọn','selected')}</span>
            <button type="button" onClick={() => onBatchPrint(selectedItems)} className="h-8 px-2.5 text-xs font-semibold text-white bg-neutral-900 rounded-md inline-flex items-center gap-1.5 cursor-pointer"><Printer className="w-3.5 h-3.5" />{tx('Xuất & in','Export & print')}</button>
            <button type="button" onClick={handleExportCsv} className="h-8 px-2.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md inline-flex items-center gap-1.5 cursor-pointer"><FileDown className="w-3.5 h-3.5" />{tx('Xuất CSV','Export CSV')}</button>
          </div>}
          <button type="button" onClick={() => setIsImportOpen(true)} className="h-8 px-3 text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-md inline-flex items-center gap-1.5 cursor-pointer shrink-0">
            <Upload className="w-3.5 h-3.5" />
            <span>{tx('Import', 'Import')}</span>
          </button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="border border-dashed border-neutral-300 rounded-lg p-12 text-center bg-white/50">
          <p className="text-sm font-medium text-neutral-700 mb-1">{items.length === 0 ? tx('Chưa có mã QR nào.', 'No saved QR codes yet.') : tx('Không tìm thấy kết quả.', 'No matching results found.')}</p>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-4">{items.length === 0 ? tx('Các mã QR bạn lưu từ trình tạo sẽ xuất hiện ở đây.', 'QR codes you save from the generator will appear here.') : tx('Thử tìm kiếm hoặc đổi bộ lọc.', 'Try another search or filter.')}</p>
          {items.length === 0 && <div className="flex items-center justify-center gap-2"><button type="button" onClick={onBackToGenerator} className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors cursor-pointer">{tx('Tạo mã QR', 'Create QR')}</button><button type="button" onClick={() => setIsImportOpen(true)} className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-md inline-flex items-center gap-1.5 cursor-pointer"><Upload className="w-3.5 h-3.5" />{tx('Import', 'Import')}</button></div>}
        </div>
      ) : (
        <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden divide-y divide-neutral-200">
          {filteredItems.map((item) => (
            <div key={item.id} className="p-3 sm:p-4 hover:bg-neutral-50/80 transition-colors flex items-center justify-between gap-4 group">
              <button type="button" onClick={() => onRestore(item)} className="flex items-center gap-3.5 min-w-0 flex-1 text-left cursor-pointer" title={tx('Mở lại trong trình tạo', 'Open in generator')}>
                <div className="w-12 h-12 bg-neutral-50 border border-neutral-200 rounded p-1 shrink-0 flex items-center justify-center overflow-hidden group-hover:border-neutral-400 transition-colors"><div className="w-full h-full bg-neutral-900 rounded-xs flex items-center justify-center text-[10px] font-mono text-white">QR</div></div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-sm font-semibold text-neutral-900 truncate">{item.title}</span><span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 shrink-0">{item.type}</span></div><p className="text-xs text-neutral-500 truncate mt-0.5 font-mono">{item.subtitle || item.rawPayload}</p></div>
              </button>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <span className="text-xs text-neutral-400 font-mono tabular-nums hidden md:inline mr-1">{formatTime(item.createdAt)}</span>
                <button type="button" onClick={() => void handleDownload(item)} className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors cursor-pointer" title={tx('Tải xuống', 'Download')}><Download className="w-4 h-4" /></button>
                <button type="button" onClick={() => void handlePrint(item)} className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors cursor-pointer" title={tx('In', 'Print')}><Printer className="w-4 h-4" /></button>
                <button type="button" onClick={() => onRestore(item)} className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors cursor-pointer" title={tx('Mở lại để chỉnh sửa', 'Open to edit')}><RotateCcw className="w-4 h-4" /></button>
                <button type="button" onClick={() => onDelete(item.id)} className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer" title={tx('Xóa khỏi lịch sử', 'Delete from history')}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {isImportOpen && (
        <ImportHistoryPanel
          isPro={isPro}
          onOpenPro={onOpenPro}
          onClose={() => setIsImportOpen(false)}
          onImport={onImport}
        />
      )}
    </div>
  );
};
