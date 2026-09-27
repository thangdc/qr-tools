import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n';
import { QRHistoryItem, QRType } from '../types/qr';
import {
  Search,
  RotateCcw,
  Download,
  Trash2,
  FileSpreadsheet,
  Layers,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';

interface HistoryViewProps {
  items: QRHistoryItem[];
  on{tx('Khôi phục', 'Restore')}: (item: QRHistoryItem) => void;
  on{tx('Xóa', 'Delete')}: (id: string) => void;
  onClear{tx('Tất cả', 'All')}: () => void;
  onBackToGenerator: () => void;
  onOpenBulk: () => void;
}

const FILTER_TYPES: { label: string; value: 'all' | QRType }[] = [
  { label: '{tx('Tất cả', 'All')}', value: 'all' },
  { label: 'URL', value: 'url' },
  { label: 'VietQR', value: 'payment' },
  { label: 'WiFi', value: 'wifi' },
  { label: 'Contact', value: 'contact' },
  { label: 'Text', value: 'text' },
];

export const HistoryView: React.FC<HistoryViewProps> = ({
  items,
  on{tx('Khôi phục', 'Restore')},
  on{tx('Xóa', 'Delete')},
  onClear{tx('Tất cả', 'All')},
  onBackToGenerator,
  onOpenBulk,
}) => {
  const { tx } = useLanguage();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | QRType>('all');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchType = filterType === 'all' || item.type === filterType;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.rawPayload.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [items, filterType, search]);

  const exportCSV = () => {
    if (items.length === 0) return;
    const headers = ['ID', 'Type', 'Title', 'Subtitle', 'Payload', 'Created Date'];
    const rows = items.map((i) => [
      i.id,
      i.type,
      `"${(i.title || '').replace(/"/g, '""')}"`,
      `"${(i.subtitle || '').replace(/"/g, '""')}"`,
      `"${(i.rawPayload || '').replace(/"/g, '""')}"`,
      new Date(i.createdAt).toISOString(),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `qr-tools-history-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString('vi-VN', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Bar for History */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <button
            type="button"
            onClick={onBackToGenerator}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{tx('Quay lại trình tạo', 'Back to Generator')}</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            {tx('Lịch sử tạo mã QR', 'QR Generation History')}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            {tx('Các mã đã tạo được lưu an toàn trong trình duyệt. Nhấn vào một mục để khôi phục.', 'Previously generated codes stored securely in your browser. Click any item to restore.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <>
              <button
                type="button"
                onClick={exportCSV}
                className="h-8 px-3 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-md transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                title="Export history to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-500" />
                <span>{tx('Xuất CSV', 'Export CSV')}</span>
              </button>

              <button
                type="button"
                onClick={onOpenBulk}
                className="h-8 px-3 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-md transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                title="Open batch manager"
              >
                <Layers className="w-3.5 h-3.5 text-neutral-500" />
                <span>{tx('Công cụ hàng loạt', 'Batch Tools')}</span>
              </button>

              <button
                type="button"
                onClick={onClear{tx('Tất cả', 'All')}}
                className="h-8 px-2.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                title="{tx('Xóa', 'Delete')} all history"
              >
                {tx('Xóa tất cả', 'Clear all')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="{tx('Tìm lịch sử theo tiêu đề, URL hoặc văn bản...', 'Search history by title, URL or text...')}"
            className="w-full h-9 pl-9 pr-3 text-xs sm:text-sm bg-white border border-neutral-300 rounded-md placeholder:text-neutral-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {/* Segmented Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {FILTER_TYPES.map((ft) => (
            <button
              key={ft.value}
              type="button"
              onClick={() => setFilterType(ft.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                filterType === ft.value
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200/70'
              }`}
            >
              {ft.label}
            </button>
          ))}
        </div>
      </div>

      {/* History Items List / Table */}
      {filteredItems.length === 0 ? (
        <div className="border border-dashed border-neutral-300 rounded-lg p-12 text-center bg-white/50">
          <p className="text-sm font-medium text-neutral-700 mb-1">
            {items.length === 0 ? 'No saved QR codes yet.' : 'No matching results found.'}
          </p>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-4">
            {items.length === 0
              ? 'Your generated QR codes will automatically appear here. Try creating your first QR code.'
              : 'Try searching with a different term or clearing the type filter.'}
          </p>
          {items.length === 0 && (
            <button
              type="button"
              onClick={onBackToGenerator}
              className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
            >
              Create QR Code
            </button>
          )}
        </div>
      ) : (
        <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden divide-y divide-neutral-200">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-3 sm:p-4 hover:bg-neutral-50/80 transition-colors flex items-center justify-between gap-4 group"
            >
              {/* Thumbnail + Details */}
              <div
                onClick={() => on{tx('Khôi phục', 'Restore')}(item)}
                className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                title="Click to restore into generator"
              >
                {/* Visual Thumbnail */}
                <div className="w-12 h-12 bg-neutral-50 border border-neutral-200 rounded p-1 shrink-0 flex items-center justify-center overflow-hidden group-hover:border-neutral-400 transition-colors">
                  <div className="w-full h-full bg-neutral-900 rounded-xs flex items-center justify-center text-[10px] font-mono text-white">
                    QR
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-900 truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 shrink-0">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 truncate mt-0.5 font-mono">
                    {item.subtitle || item.rawPayload}
                  </p>
                </div>
              </div>

              {/* Timestamp & Actions */}
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <span className="text-xs text-neutral-400 font-mono tabular-nums hidden sm:inline">
                  {formatTime(item.createdAt)}
                </span>

                <button
                  type="button"
                  onClick={() => on{tx('Khôi phục', 'Restore')}(item)}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors cursor-pointer"
                  title="{tx('Khôi phục', 'Restore')} into generator"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const a = document.createElement('a');
                    // quick fallback
                    on{tx('Khôi phục', 'Restore')}(item);
                  }}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors cursor-pointer hidden sm:inline-flex"
                  title="Open in editor"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => on{tx('Xóa', 'Delete')}(item.id)}
                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                  title="{tx('Xóa', 'Delete')} from history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
