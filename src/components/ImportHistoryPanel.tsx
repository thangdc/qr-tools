import React, { useRef, useState } from 'react';
import { FileSpreadsheet, Upload, X, Plus, Trash2 } from 'lucide-react';
import { BulkQRItem, QRHistoryItem, QRType } from '../types/qr';
import { useLanguage } from '../i18n';
import { trackEvent } from '../utils/analytics';
import { generatePayload } from '../utils/qrPayload';

interface ImportHistoryPanelProps {
  isPro: boolean;
  onOpenPro: (source?: string) => void;
  onClose: () => void;
  onImport: (items: BulkQRItem[]) => void;
  existingItems: QRHistoryItem[];
}

export const ImportHistoryPanel: React.FC<ImportHistoryPanelProps> = ({
  isPro,
  onOpenPro,
  onClose,
  onImport,
  existingItems,
}) => {
  const { tx } = useLanguage();
  const [items, setItems] = useState<BulkQRItem[]>([]);
  const [importText, setImportText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const duplicateIds = React.useMemo(() => {
    const seen = new Set(existingItems.map((item) => `${item.type}::${item.rawPayload}`));
    const duplicates = new Set<string>();

    for (const item of items) {
      const payload = generatePayload(item.type, item.data);
      const key = payload ? `${item.type}::${payload}` : '';
      if (!key) continue;
      if (seen.has(key)) {
        duplicates.add(item.id);
      }
      seen.add(key);
    }

    return duplicates;
  }, [existingItems, items]);

  const importableItems = items.filter((item) => item.selected && !duplicateIds.has(item.id));
  const duplicateCount = duplicateIds.size;

  const parseCsvRows = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (char === '"' && next === '"') {
          field += '"';
          i += 1;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          field += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ',' || char === '\t') {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (char !== '\r') {
        field += char;
      }
    }

    if (field || row.length) {
      row.push(field);
      rows.push(row);
    }

    return rows.filter((current) => current.some((value) => value.trim()));
  };

  const parseLines = (text: string) => {
    const rows = parseCsvRows(text.trim());
    if (rows.length < 2) return;

    const header = rows[0].map((value) => value.trim().toLowerCase());
    if (header.join(',') !== 'label,type,data,created at') {
      return;
    }

    const labelIndex = header.indexOf('label');
    const typeIndex = header.indexOf('type');
    const dataIndex = header.indexOf('data');

    const parsed = rows.slice(1).flatMap((row, index): BulkQRItem[] => {
      const label = row[labelIndex]?.trim();
      const type = row[typeIndex]?.trim() as QRType;
      const dataText = row[dataIndex]?.trim();

      if (!label || !dataText) return [];

      try {
        const data = JSON.parse(dataText);
        if (!data || typeof data !== 'object') return [];
        return [{
          id: `import-${Date.now()}-${index}`,
          label,
          type,
          data,
          selected: true,
        }];
      } catch {
        return [];
      }
    });

    setItems((prev) => [...prev, ...parsed]);
    if (parsed.length > 0) {
      trackEvent('bulk_import_completed', { count: parsed.length, method: 'history' });
    }
  };

  const handlePasteImport = () => {
    if (!isPro) {
      onOpenPro('history_import');
      return;
    }
    parseLines(importText);
    setImportText('');
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isPro) {
      onOpenPro('history_import_file');
      event.target.value = '';
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseLines(text);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleImport = () => {
    const selected = importableItems;
    if (!selected.length) return;

    if (!isPro) {
      onOpenPro('history_import');
      return;
    }

    onImport(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white border border-neutral-200 shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">{tx('Import nhiều QR vào lịch sử', 'Import QR codes into History')}</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {tx('Dán dữ liệu từ Excel/Google Sheets hoặc tải file CSV/TSV.', 'Paste from Excel/Google Sheets or upload a CSV/TSV file.')}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg cursor-pointer" aria-label={tx('Đóng', 'Close')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <textarea
              rows={4}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={tx('Tên, Nội dung\nBàn 01, https://menu.example.com/table/01\nWiFi, WIFI:T:WPA;S:Office;P:secret;;', 'Label, Payload\nTable 01, https://menu.example.com/table/01\nWiFi, WIFI:T:WPA;S:Office;P:secret;;')}
              className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
            />
            <div className="flex sm:flex-col gap-2">
              <button
                type="button"
                onClick={handlePasteImport}
                disabled={!importText.trim()}
                className="h-9 px-3 text-xs font-semibold text-white bg-neutral-900 hover:bg-black disabled:opacity-40 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {tx('Thêm', 'Add')}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-3 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                CSV/TSV
              </button>
              <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFileImport} className="hidden" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
              <FileSpreadsheet className="w-4 h-4 text-neutral-400" />
              {tx('Sẽ thêm vào lịch sử', 'Will be added to History')}
              <span className="text-neutral-400 font-normal">· {importableItems.length}</span>{duplicateCount > 0 && <span className="text-amber-600 font-normal">· {duplicateCount} {tx('trùng', 'duplicate')}</span>}
            </div>
            <span className="text-[11px] text-neutral-400">{tx('Tên, Loại, Dữ liệu', 'Label, Type, Data')}</span>
          </div>

          {items.length === 0 ? (
            <div className="border border-dashed border-neutral-300 rounded-xl p-8 text-center text-xs text-neutral-500">
              {tx('Chưa có dữ liệu. Dán từ Excel hoặc chọn file CSV/TSV.', 'No data yet. Paste from Excel or choose a CSV/TSV file.')}
            </div>
          ) : (
            <div className="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100">
              {items.map((item) => (
                <div key={item.id} className={`p-3 flex items-center gap-3 ${duplicateIds.has(item.id) ? 'bg-amber-50/70' : ''}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono shrink-0 ${duplicateIds.has(item.id) ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100'}`}>QR</div>
                  <div className="min-w-0 flex-1">
                    <input
                      value={item.label}
                      onChange={(e) => setItems((prev) => prev.map((current) => current.id === item.id ? { ...current, label: e.target.value } : current))}
                      className="w-full text-xs font-semibold text-neutral-900 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 outline-none truncate"
                    />
                    <input
                      value={JSON.stringify(item.data)}
                      onChange={(e) => {
                        try {
                          const data = JSON.parse(e.target.value);
                          setItems((prev) => prev.map((current) => current.id === item.id ? { ...current, data } : current));
                        } catch {
                          // Keep the last valid structured data while the user edits.
                        }
                      }}
                      className="w-full mt-0.5 text-[11px] font-mono text-neutral-500 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 outline-none truncate"
                    />
                  </div>
                  {duplicateIds.has(item.id) && <span className="text-[10px] font-semibold text-amber-700 shrink-0">{tx('Đã có', 'Already exists')}</span>}
                  <button type="button" onClick={() => removeItem(item.id)} className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer" title={tx('Xóa dòng', 'Remove row')}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3">
          <span className="text-xs text-neutral-500">{duplicateCount > 0 ? tx(`${duplicateCount} mã đã có trong lịch sử và sẽ không được thêm lại.`, `${duplicateCount} codes already exist in History and will not be added again.`) : tx('Các mã được thêm vào lịch sử và có thể tải xuống hoặc in ngay.', 'Imported codes are added to History and can be downloaded or printed immediately.')}</span>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={onClose} className="h-9 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-200 rounded-lg cursor-pointer">{tx('Hủy', 'Cancel')}</button>
            <button type="button" onClick={handleImport} disabled={!importableItems.length} className="h-9 px-4 text-xs font-semibold text-white bg-neutral-900 hover:bg-black disabled:opacity-40 rounded-lg cursor-pointer">
              {tx('Thêm vào lịch sử', 'Add to History')} ({importableItems.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
