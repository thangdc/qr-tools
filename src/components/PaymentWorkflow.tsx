import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Download, FileText, Printer, RotateCcw, WalletCards } from 'lucide-react';
import { BatchPrintItem } from './BatchCardPrintModal';
import { VIETNAM_BANKS, buildVietQRPayload } from '../utils/vietqr';
import { trackEvent } from '../utils/analytics';

interface Receivable {
  id: string;
  name: string;
  phone: string;
  amount: number;
  description: string;
  status: 'Chưa thu' | 'Đã thu';
  paidAt?: number;
}

interface PaymentWorkflowProps {
  isPro: boolean;
  onOpenPro: (source?: string) => void;
  onBack: () => void;
  onGenerateAndPrint: (items: BatchPrintItem[]) => void;
}

const SAMPLE_DATA = `Mã\tNgười nộp\tSố điện thoại\tSố tiền\tNội dung\nP101\tNguyễn Văn A\t0901234567\t1500000\tTien phong thang 10\nP102\tTrần Thị B\t0912345678\t1800000\tTien phong thang 10\nP201\tLê Văn C\t\t950000\tTien dien nuoc thang 10`;

function parseAmount(value: string) {
  const digits = value.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}

function parseRows(text: string): Receivable[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map(x => x.trim().toLowerCase());
  const find = (...names: string[]) => headers.findIndex(h => names.some(n => h === n || h.includes(n)));
  const idIdx = find('mã', 'ma', 'id');
  const nameIdx = find('người nộp', 'nguoi nop', 'khách hàng', 'khach hang', 'tên', 'ten');
  const phoneIdx = find('số điện thoại', 'so dien thoai', 'điện thoại', 'dien thoai', 'phone');
  const amountIdx = find('số tiền', 'so tien', 'amount', 'tiền');
  const descIdx = find('nội dung', 'noi dung', 'description', 'khoản thu', 'khoan thu');
  if (idIdx < 0 || nameIdx < 0 || amountIdx < 0) return [];

  return lines.slice(1).map((line, index) => {
    const cells = line.split(delimiter).map(x => x.trim().replace(/^"(.*)"$/, '$1'));
    return {
      id: cells[idIdx] || `THU-${index + 1}`,
      name: cells[nameIdx] || '',
      phone: phoneIdx >= 0 ? cells[phoneIdx] || '' : '',
      amount: parseAmount(cells[amountIdx] || ''),
      description: descIdx >= 0 ? cells[descIdx] || '' : 'Thanh toan',
      status: 'Chưa thu' as const,
    };
  }).filter(x => x.name && x.amount > 0);
}

function formatMoney(value: number) {
  return `${value.toLocaleString('vi-VN')} ₫`;
}

export const PaymentWorkflow: React.FC<PaymentWorkflowProps> = ({
  isPro,
  onOpenPro,
  onBack,
  onGenerateAndPrint,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [bankBin, setBankBin] = useState('970436');
  const [bankName, setBankName] = useState('Vietcombank');
  const [accountNumber, setAccountNumber] = useState('1029384756');
  const [accountName, setAccountName] = useState('NGUYEN VAN A');
  const [input, setInput] = useState(SAMPLE_DATA);
  const [rows, setRows] = useState<Receivable[]>([]);
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');

  const total = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows]);
  const paidTotal = useMemo(() => rows.filter(r => r.status === 'Đã thu').reduce((sum, row) => sum + row.amount, 0), [rows]);
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => [r.id, r.name, r.phone, r.description, r.status].some(v => v.toLowerCase().includes(q)));
  }, [rows, query]);

  const importRows = () => {
    const parsed = parseRows(input);
    setRows(parsed);
    setStep(1);
    trackEvent('workflow_payment_started', { count: parsed.length });
  };

  const buildPrintItems = (): BatchPrintItem[] => rows.map(row => ({
    id: row.id,
    label: row.name,
    subtitle: `${row.id} · ${formatMoney(row.amount)}`,
    payload: buildVietQRPayload(bankBin, accountNumber, accountName, row.amount, row.description),
    type: 'payment',
    accountName,
    accountNumber,
    bankName,
  }));

  const handlePrint = () => {
    if (!isPro) {
      onOpenPro('workflow_payment_qr_print');
      return;
    }
    trackEvent('workflow_payment_qr_print_opened', { count: rows.length });
    onGenerateAndPrint(buildPrintItems());
  };

  const togglePaid = (id: string) => {
    setRows(prev => prev.map(row => row.id === id
      ? { ...row, status: row.status === 'Đã thu' ? 'Chưa thu' : 'Đã thu', paidAt: row.status === 'Đã thu' ? undefined : Date.now() }
      : row
    ));
  };

  const exportCsv = () => {
    const header = ['Mã', 'Người nộp', 'Số điện thoại', 'Số tiền', 'Nội dung', 'Trạng thái', 'Thời gian thu'];
    const body = rows.map(row => [
      row.id, row.name, row.phone, row.amount,
      row.description, row.status,
      row.paidAt ? new Date(row.paidAt).toLocaleString('vi-VN') : '',
    ]);
    const csv = [header, ...body].map(cols => cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-thu-tien-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent('workflow_payment_exported', { count: rows.length });
  };

  const reset = () => {
    setRows([]);
    setQuery('');
    setNote('');
    setStep(1);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={step === 1 ? onBack : () => setStep((Math.max(1, step - 1) as 1 | 2 | 3 | 4))} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
          <WalletCards className="w-3.5 h-3.5" /> Thu tiền bằng QR
        </span>
      </div>

      <div className="flex items-center gap-2 text-[11px] overflow-x-auto pb-1">
        {['Nhập danh sách', 'Tạo & in QR', 'Theo dõi thu', 'Kết quả'].map((label, index) => (
          <React.Fragment key={label}>
            <span className={`whitespace-nowrap px-2.5 py-1 rounded-full ${step === index + 1 ? 'bg-neutral-900 text-white' : step > index + 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
              {index + 1}. {label}
            </span>
            {index < 3 && <span className="text-neutral-300">→</span>}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 space-y-5">
          <div>
            <h1 className="text-lg font-bold text-neutral-900">Thu tiền / Thanh toán</h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">Nhập danh sách các khoản cần thu, tạo VietQR riêng cho từng người rồi theo dõi trạng thái thu.</p>
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            <label className="text-xs font-medium text-neutral-700 sm:col-span-1">Ngân hàng
              <select value={bankBin} onChange={e => { setBankBin(e.target.value); setBankName(e.target.options[e.target.selectedIndex].text); }} className="mt-1.5 w-full h-9 rounded-lg border border-neutral-200 px-2.5 text-xs">
                {VIETNAM_BANKS.map(bank => <option key={bank.bin} value={bank.bin}>{bank.shortName}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-neutral-700 sm:col-span-1">Số tài khoản
              <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="mt-1.5 w-full h-9 rounded-lg border border-neutral-200 px-2.5 text-xs" />
            </label>
            <label className="text-xs font-medium text-neutral-700 sm:col-span-2">Tên chủ tài khoản
              <input value={accountName} onChange={e => setAccountName(e.target.value)} className="mt-1.5 w-full h-9 rounded-lg border border-neutral-200 px-2.5 text-xs" />
            </label>
          </div>

          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-900">
            <strong>Luồng thực tế:</strong> mỗi khoản thu có QR chứa đúng số tiền + nội dung chuyển khoản. Sau khi khách thanh toán, bạn đánh dấu “Đã thu” để đối soát. V1 chưa tự xác nhận giao dịch ngân hàng.
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-xs font-semibold text-neutral-800">Danh sách khoản thu</label>
              <button type="button" onClick={() => setInput(SAMPLE_DATA)} className="text-[11px] text-blue-700 hover:underline cursor-pointer">Dùng dữ liệu mẫu</button>
            </div>
            <textarea value={input} onChange={e => setInput(e.target.value)} rows={9} className="w-full rounded-xl border border-neutral-200 p-3 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-100" />
            <p className="text-[11px] text-neutral-400 mt-1.5">Cột bắt buộc: Mã, Người nộp, Số tiền. Có thể dán trực tiếp từ Excel / Google Sheets.</p>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={importRows} disabled={!input.trim()} className="h-9 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold hover:bg-black disabled:opacity-40 cursor-pointer">
              Tiếp tục →
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-neutral-900">Tạo QR thanh toán</h1>
              <p className="text-xs text-neutral-500 mt-1">{rows.length} khoản thu · tổng {formatMoney(total)}</p>
            </div>
            <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer">
              <Printer className="w-3.5 h-3.5" /> Tạo & in QR
            </button>
          </div>
          <div className="grid gap-2">
            {rows.map(row => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-neutral-900">{row.name} <span className="text-neutral-400 font-normal">· {row.id}</span></div>
                  <div className="text-[11px] text-neutral-500">{row.description}</div>
                </div>
                <span className="text-sm font-bold text-neutral-900">{formatMoney(row.amount)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => setStep(3)} className="h-9 px-4 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 cursor-pointer">Tiếp tục theo dõi →</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-neutral-900">Theo dõi & đối soát</h1>
              <p className="text-xs text-neutral-500 mt-1">Đánh dấu các khoản đã nhận tiền. Bạn vẫn có thể mở lại danh sách để kiểm tra.</p>
            </div>
            <div className="flex gap-2">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm mã, tên..." className="h-8 w-36 sm:w-48 rounded-lg border border-neutral-200 px-2.5 text-xs" />
              <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-neutral-200 text-xs font-semibold cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Xuất CSV
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-neutral-50 p-3"><div className="text-[11px] text-neutral-500">Tổng</div><div className="text-sm font-bold">{formatMoney(total)}</div></div>
            <div className="rounded-xl bg-emerald-50 p-3"><div className="text-[11px] text-emerald-700">Đã thu</div><div className="text-sm font-bold text-emerald-800">{formatMoney(paidTotal)}</div></div>
            <div className="rounded-xl bg-amber-50 p-3"><div className="text-[11px] text-amber-700">Còn lại</div><div className="text-sm font-bold text-amber-800">{formatMoney(total - paidTotal)}</div></div>
          </div>
          <div className="overflow-x-auto border border-neutral-200 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr><th className="text-left p-2.5">Mã</th><th className="text-left p-2.5">Người nộp</th><th className="text-right p-2.5">Số tiền</th><th className="text-left p-2.5">Nội dung</th><th className="text-left p-2.5">Trạng thái</th></tr>
              </thead>
              <tbody>
                {filteredRows.map(row => (
                  <tr key={row.id} className="border-t border-neutral-100">
                    <td className="p-2.5 font-mono">{row.id}</td><td className="p-2.5">{row.name}</td><td className="p-2.5 text-right font-semibold">{formatMoney(row.amount)}</td><td className="p-2.5 text-neutral-500">{row.description}</td>
                    <td className="p-2.5"><button type="button" onClick={() => togglePaid(row.id)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${row.status === 'Đã thu' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}><Check className="w-3 h-3" />{row.status}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end"><button type="button" onClick={() => setStep(4)} className="h-9 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer">Xem kết quả →</button></div>
        </section>
      )}

      {step === 4 && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 space-y-5">
          <div className="text-center py-3">
            <div className="mx-auto w-11 h-11 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center"><Check className="w-5 h-5" /></div>
            <h1 className="text-lg font-bold text-neutral-900 mt-3">Đã hoàn tất đối soát</h1>
            <p className="text-xs text-neutral-500 mt-1">{rows.filter(r => r.status === 'Đã thu').length}/{rows.length} khoản đã đánh dấu đã thu.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-neutral-200 p-4"><div className="text-[11px] text-neutral-500">Đã thu</div><div className="text-lg font-bold text-emerald-700">{formatMoney(paidTotal)}</div></div>
            <div className="rounded-xl border border-neutral-200 p-4"><div className="text-[11px] text-neutral-500">Chưa thu</div><div className="text-lg font-bold text-amber-700">{formatMoney(total - paidTotal)}</div></div>
            <div className="rounded-xl border border-neutral-200 p-4"><div className="text-[11px] text-neutral-500">Tỷ lệ</div><div className="text-lg font-bold">{total ? Math.round((paidTotal / total) * 100) : 0}%</div></div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer"><Download className="w-3.5 h-3.5" /> Xuất kết quả CSV</button>
            <button type="button" onClick={() => setStep(3)} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-neutral-200 text-xs font-semibold cursor-pointer"><FileText className="w-3.5 h-3.5" /> Đối soát lại</button>
            <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-neutral-200 text-xs font-semibold cursor-pointer"><RotateCcw className="w-3.5 h-3.5" /> Làm lại</button>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-900">
            {note || 'Lưu ý: trạng thái “Đã thu” là xác nhận thủ công trong V1. Không nên dùng trạng thái này như bằng chứng giao dịch ngân hàng.'}
          </div>
        </section>
      )}
    </div>
  );
};
