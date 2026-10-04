import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, FileSpreadsheet, Plus, Trash2, Printer, Info } from 'lucide-react';
import { BatchPrintItem } from './BatchCardPrintModal';
import { trackEvent } from '../utils/analytics';

interface BulkPrintWorkflowProps {
  isPro: boolean;
  onOpenPro: (source?: string) => void;
  onBack: () => void;
  onGenerateAndPrint: (items: BatchPrintItem[]) => void;
}

interface BulkRow {
  id: string;
  label: string;
  payload: string;
}

const SAMPLE = 'Tên\tNội dung\nBàn 01\thttps://example.com/table/01\nBàn 02\thttps://example.com/table/02\nBàn 03\thttps://example.com/table/03';

function parseRows(text: string): BulkRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const first = lines[0].split(/\t|,/).map((value) => value.trim().toLowerCase());
  const hasHeader =
    first.length >= 2 &&
    (first[0] === 'tên' || first[0] === 'name' || first[0] === 'label') &&
    (first[1] === 'nội dung' || first[1] === 'content' || first[1] === 'data' || first[1] === 'payload');

  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.flatMap((line, index) => {
    const parts = line.includes('\t') ? line.split('\t') : line.split(',');
    const label = parts[0]?.trim();
    const payload = parts.slice(1).join(line.includes('\t') ? '\t' : ',').trim();

    if (!label || !payload) return [];

    return [{
      id: `bulk-${Date.now()}-${index}`,
      label,
      payload,
    }];
  });
}

export const BulkPrintWorkflow: React.FC<BulkPrintWorkflowProps> = ({
  isPro,
  onOpenPro,
  onBack,
  onGenerateAndPrint,
}) => {
  const [inputText, setInputText] = useState('');
  const [rows, setRows] = useState<BulkRow[]>([]);

  const validRows = useMemo(
    () => rows.filter((row) => row.label.trim() && row.payload.trim()),
    [rows]
  );

  const handleParse = () => {
    const parsed = parseRows(inputText);
    setRows((prev) => [...prev, ...parsed]);
    if (parsed.length) {
      trackEvent('workflow_bulk_print_imported', { count: parsed.length, method: 'paste' });
      setInputText('');
    }
  };

  const handleUseSample = () => {
    setInputText(SAMPLE);
  };

  const handleGenerateAndPrint = () => {
    if (!validRows.length) return;

    if (!isPro) {
      trackEvent('pro_feature_clicked', {
        feature: 'workflow_bulk_print',
        source: 'workflow_bulk_print',
        is_pro: false,
      });
      onOpenPro('workflow_bulk_print');
      return;
    }

    const items: BatchPrintItem[] = validRows.map((row) => ({
      id: row.id,
      label: row.label,
      payload: row.payload,
    }));

    trackEvent('workflow_bulk_print_opened', { count: items.length });
    onGenerateAndPrint(items);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="pb-5 border-b border-neutral-200">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 mb-3 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại Workflows
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Tạo QR hàng loạt & In
          </h1>
          {!isPro && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              PRO
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Dán danh sách từ Excel / Google Sheets → tạo nhiều QR → chọn mẫu → in tem hoặc thẻ.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        <section className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-neutral-600" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">① Nhập danh sách</h2>
              <p className="text-[11px] text-neutral-500">Mỗi dòng: Tên + Nội dung QR</p>
            </div>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={8}
            placeholder={'Tên\tNội dung\nBàn 01\thttps://example.com/table/01'}
            className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleUseSample}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-900 cursor-pointer"
            >
              Dùng dữ liệu mẫu
            </button>
            <button
              type="button"
              onClick={handleParse}
              disabled={!inputText.trim()}
              className="h-9 px-4 text-xs font-semibold text-white bg-neutral-900 hover:bg-black disabled:opacity-40 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm vào danh sách
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3 flex items-start gap-2 text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-5">
              Có thể dán trực tiếp 2 cột từ Excel / Google Sheets. Cột Nội dung có thể là URL, văn bản hoặc payload QR đã có.
            </p>
          </div>
        </section>

        <section className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Danh sách QR</h2>
              <p className="text-[11px] text-neutral-500">{validRows.length} mã hợp lệ</p>
            </div>
            {rows.length > 0 && (
              <button
                type="button"
                onClick={() => setRows([])}
                className="text-[11px] font-medium text-red-600 hover:text-red-700 cursor-pointer"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto divide-y divide-neutral-100">
            {rows.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400">
                Chưa có dữ liệu. Dán danh sách bên trái để bắt đầu.
              </div>
            ) : (
              rows.map((row, index) => (
                <div key={row.id} className="p-3 flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-neutral-100 flex items-center justify-center text-[10px] font-mono text-neutral-500 shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <input
                      value={row.label}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((item) => item.id === row.id ? { ...item, label: e.target.value } : item)
                        )
                      }
                      className="w-full text-xs font-semibold text-neutral-900 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 outline-none truncate"
                    />
                    <input
                      value={row.payload}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((item) => item.id === row.id ? { ...item, payload: e.target.value } : item)
                        )
                      }
                      className="w-full mt-0.5 text-[11px] font-mono text-neutral-500 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 outline-none truncate"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}
                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer shrink-0"
                    title="Xóa dòng"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-neutral-200 bg-neutral-50">
            <button
              type="button"
              onClick={handleGenerateAndPrint}
              disabled={!validRows.length}
              className="w-full h-10 px-4 text-xs font-semibold text-white bg-neutral-900 hover:bg-black disabled:opacity-40 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              ② Tạo & in QR ({validRows.length})
            </button>
            {!isPro && validRows.length > 0 && (
              <p className="text-[11px] text-center text-neutral-500 mt-2">
                Tính năng tạo & in hàng loạt dành cho Pro.
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:p-5 flex items-start gap-2.5">
        <ArrowRight className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-600 leading-5">
          <strong className="text-neutral-800">③ Chọn cách in:</strong> sau khi tạo QR, bạn có thể chọn mẫu, kích thước A4 hoặc lưới nhãn dán rồi in tất cả.
        </div>
      </div>
    </div>
  );
};
