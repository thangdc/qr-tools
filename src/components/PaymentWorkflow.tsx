import React, { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Check, Download, FileText, Printer, RotateCcw, Upload, WalletCards } from 'lucide-react';
import { BatchPrintItem } from './BatchCardPrintModal';
import { VIETNAM_BANKS, buildVietQRPayload } from '../utils/vietqr';
import { trackEvent } from '../utils/analytics';
import { useQRScanner } from '../hooks/useQRScanner';

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

function parseVietQRPayload(raw: string) {
  const fields: Record<string, string> = {};
  let offset = 0;
  while (offset + 4 <= raw.length) {
    const tag = raw.slice(offset, offset + 2);
    const length = Number(raw.slice(offset + 2, offset + 4));
    if (!Number.isFinite(length) || offset + 4 + length > raw.length) break;
    fields[tag] = raw.slice(offset + 4, offset + 4 + length);
    offset += 4 + length;
  }

  let description = '';
  const additional = fields['62'] || '';
  let subOffset = 0;
  while (subOffset + 4 <= additional.length) {
    const tag = additional.slice(subOffset, subOffset + 2);
    const length = Number(additional.slice(subOffset + 2, subOffset + 4));
    if (!Number.isFinite(length) || subOffset + 4 + length > additional.length) break;
    if (tag === '08') description = additional.slice(subOffset + 4, subOffset + 4 + length);
    subOffset += 4 + length;
  }

  return {
    amount: Number(fields['54'] || 0),
    description,
  };
}

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();
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
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ row?: Receivable; status: 'success' | 'unknown' } | null>(null);
  const [scanned, setScanned] = useState<{ id: string; name: string; at: number }[]>([]);
  const [scanPaused, setScanPaused] = useState(false);
  const [scanError, setScanError] = useState('');

  const total = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows]);
  const paidTotal = useMemo(() => rows.filter(r => r.status === 'Đã thu').reduce((sum, row) => sum + row.amount, 0), [rows]);
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => [r.id, r.name, r.phone, r.description, r.status].some(v => v.toLowerCase().includes(q)));
  }, [rows, query]);

  const importRows = () => {
    const parsed = parseRows(input);
    if (parsed.length === 0) return;
    setRows(parsed);
    setStep(2);
    trackEvent('workflow_payment_started', { count: parsed.length });
  };

  const buildPrintItems = (): BatchPrintItem[] => rows.map(row => ({
    id: row.id,
    label: row.name,
    subtitle: `${row.id} · ${formatMoney(row.amount)}`,
    payload: buildVietQRPayload(bankBin, accountNumber, accountName, row.amount, paymentDescription(row)),
    type: 'payment',
    accountName,
    accountNumber,
    bankName,
  }));

  const paymentDescription = (row: Receivable) => `${row.description} ${row.id}`.trim();

  const pauseAfterScan = (duration = 1500) => {
    setScanPaused(true);
    window.setTimeout(() => setScanPaused(false), duration);
  };

  const handleDecodedPayment = useCallback((raw: string) => {
    if (!isPro) { stopCamera(); onOpenPro('workflow_payment_scan'); return; }
    if (scanPaused) return;

    const payload = parseVietQRPayload(raw);
    if (!payload.amount || !payload.description) {
      setLastResult({ status: 'unknown' });
      setScanError('QR này không phải mã thanh toán hợp lệ.');
      trackEvent('workflow_payment_scanned', { status: 'unknown' });
      pauseAfterScan();
      return;
    }

    const normalizedDescription = normalizeText(payload.description);
    const match = rows.find(row =>
      row.amount === payload.amount &&
      normalizedDescription.includes(normalizeText(row.id))
    ) || rows.find(row =>
      row.amount === payload.amount &&
      normalizedDescription.includes(normalizeText(row.description))
    );

    if (!match) {
      setLastResult({ status: 'unknown' });
      setScanError('QR này không thuộc danh sách khoản thu.');
      trackEvent('workflow_payment_scanned', { status: 'unknown' });
      pauseAfterScan();
      return;
    }

    const alreadyPaid = match.status === 'Đã thu';
    const updated = alreadyPaid ? match : { ...match, status: 'Đã thu' as const, paidAt: Date.now() };

    if (!alreadyPaid) {
      setRows(prev => prev.map(row => row.id === match.id ? updated : row));
    }

    setLastResult({ row: updated, status: 'success' });
    setScanError('');
    setScanned(prev => [
      { id: match.id, name: match.name, at: updated.paidAt || Date.now() },
      ...prev.filter(item => item.id !== match.id)
    ].slice(0, 8));
    trackEvent('workflow_payment_scanned', {
      id: match.id,
      amount: match.amount,
      status: alreadyPaid ? 'duplicate' : 'success'
    });
    pauseAfterScan(alreadyPaid ? 1800 : 1500);
  }, [rows, scanPaused, isPro, onOpenPro]);

  const { videoRef, isCameraActive: cameraActive, cameraError, startCamera, stopCamera, scanFile } = useQRScanner({
    onDecoded: handleDecodedPayment,
    stopAfterDecode: false,
  });

  const handleImageUpload = async (file?: File) => {
    if (!isPro) { onOpenPro('workflow_payment_scan'); return; }
    if (!file) return;
    const raw = await scanFile(file);
    if (!raw) {
      setScanError('Không tìm thấy mã QR trong ảnh.');
      setLastResult({ status: 'unknown' });
    } else {
      setScanError('');
    }
  };

  const goToScan = () => { if (!isPro) { onOpenPro('workflow_payment_scan'); return; } setStep(3); };
  const handleStartScan = () => { if (!isPro) { onOpenPro('workflow_payment_scan'); return; } void startCamera(); };

  const totalReceivables = rows.length;
  const paidCount = rows.filter(row => row.status === 'Đã thu').length;


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
    stopCamera();
    setRows([]);
    setQuery('');
    setLastResult(null);
    setScanned([]);
    setScanError('');
    setScanPaused(false);
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
              <Printer className="w-3.5 h-3.5" /> Tạo & in QR {!isPro && <span className="ml-1 rounded bg-white/15 px-1 py-0.5 text-[9px] font-bold">PRO</span>}
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
            <button type="button" onClick={goToScan} className="h-9 px-4 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 cursor-pointer">Tiếp tục theo dõi →</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => { stopCamera(); setStep(2); }} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" />Quay lại tạo & in QR
            </button>
            <button type="button" onClick={() => { stopCamera(); setStep(4); }} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
              Kết quả <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-5">
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
              <div className="relative aspect-video bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center">
                {cameraActive
                  ? <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                  : <div className="text-center text-neutral-400"><WalletCards className="w-10 h-10 mx-auto mb-2" /><p className="text-xs">Bấm bắt đầu để quét QR thanh toán</p></div>}
                {cameraActive && scanPaused && (
                  <div className="absolute inset-0 z-10 bg-black/45 flex items-center justify-center">
                    <div className="rounded-xl bg-black/75 px-4 py-3 text-center text-white">
                      <p className="text-xs font-semibold">{lastResult?.row?.status === 'Đã thu' ? 'Đã thu' : 'Đã xác nhận'}</p>
                      <p className="text-[11px] text-white/70 mt-1">Chuẩn bị quét tiếp...</p>
                    </div>
                  </div>
                )}
                {cameraActive && (
                  <div className="absolute inset-[12%] border-2 border-white/80 rounded-2xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]">
                    <span className="absolute -top-0.5 -left-0.5 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg" />
                    <span className="absolute -top-0.5 -right-0.5 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg" />
                    <span className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg" />
                    <div className="absolute left-1/2 top-1/2 w-[70%] h-0.5 -translate-x-1/2 -translate-y-1/2 bg-white/70" />
                  </div>
                )}
              </div>
              {cameraError && <div className="text-xs text-red-600">{cameraError}</div>}
              {scanError && <div className="text-xs text-red-600">{scanError}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={cameraActive ? stopCamera : handleStartScan} className={`flex-1 h-9 rounded-lg text-xs font-semibold cursor-pointer ${cameraActive ? 'bg-red-600 text-white' : 'bg-neutral-900 text-white'}`}>
                  {cameraActive ? 'Dừng camera' : <>Bắt đầu quét {!isPro && <span className="ml-1 rounded bg-white/15 px-1 py-0.5 text-[9px] font-bold">PRO</span>}</>}
                </button>
                <label onClick={event=>{if(!isPro){event.preventDefault();onOpenPro('workflow_payment_scan');}}} className="flex-1 h-9 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />Quét bằng ảnh
                  <input type="file" accept="image/*" className="hidden" onChange={e => void handleImageUpload(e.target.files?.[0])} />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                {!lastResult ? (
                  <div className="py-8 text-center text-neutral-400 text-xs">Đang chờ quét...</div>
                ) : lastResult.status === 'success' ? (
                  <div className="text-center py-5">
                    <Check className="w-10 h-10 mx-auto text-emerald-600" />
                    <p className="mt-2 text-xs font-semibold text-emerald-700">{lastResult.row?.status === 'Đã thu' ? 'ĐÃ XÁC NHẬN' : 'ĐÃ THANH TOÁN'}</p>
                    <p className="text-lg font-bold text-neutral-900 mt-1">{lastResult.row?.name}</p>
                    <p className="text-xs text-neutral-500">{lastResult.row?.id}</p>
                    <div className="mt-3 space-y-1 text-xs text-left bg-neutral-50 rounded-lg p-3">
                      <p><strong>Số tiền:</strong> {formatMoney(lastResult.row?.amount || 0)}</p>
                      <p><strong>Nội dung:</strong> {lastResult.row?.description || '—'}</p>
                      {lastResult.row?.phone && <p><strong>SĐT:</strong> {lastResult.row.phone}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <div className="w-10 h-10 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center">!</div>
                    <p className="mt-2 text-xs font-semibold text-red-700">KHÔNG TÌM THẤY</p>
                    <p className="text-xs text-neutral-500 mt-2">QR này không thuộc danh sách khoản thu.</p>
                  </div>
                )}
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Tiến độ</h2><span className="text-xs text-neutral-500">{paidCount}/{totalReceivables}</span></div>
                <div className="h-2 rounded-full bg-neutral-100 mt-3 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${totalReceivables ? paidCount / totalReceivables * 100 : 0}%` }} /></div>
                <p className="text-[11px] text-neutral-500 mt-3">Quét QR của từng khoản thu để đánh dấu đã thu.</p>
                <button type="button" onClick={() => { stopCamera(); setStep(4); }} className="w-full mt-4 h-9 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer">Xem kết quả</button>
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <h2 className="text-sm font-semibold">Quét gần đây</h2>
                <div className="mt-3 space-y-2 max-h-44 overflow-auto">
                  {scanned.map(scan => (
                    <div key={`${scan.id}-${scan.at}`} className="flex items-center justify-between text-xs">
                      <span className="truncate mr-2">{scan.id} · {scan.name}</span>
                      <span className="text-emerald-600 shrink-0">Đã thu</span>
                    </div>
                  ))}
                  {!scanned.length && <p className="text-xs text-neutral-400">Chưa có lượt quét.</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl overflow-x-auto">
            <div className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Danh sách khoản thu</h2>
                <p className="text-[11px] text-neutral-500">{paidCount}/{totalReceivables} khoản đã thu · {formatMoney(paidTotal)} / {formatMoney(total)}</p>
              </div>
              <div className="flex gap-2">
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm mã, tên..." className="h-8 w-36 sm:w-48 rounded-lg border border-neutral-200 px-2.5 text-xs" />
                <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-neutral-200 text-xs font-semibold cursor-pointer">
                  <Download className="w-3.5 h-3.5" /> Xuất CSV
                </button>
              </div>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr><th className="text-left p-2.5">Mã</th><th className="text-left p-2.5">Người nộp</th><th className="text-right p-2.5">Số tiền</th><th className="text-left p-2.5">Nội dung</th><th className="text-left p-2.5">Trạng thái</th></tr>
              </thead>
              <tbody>
                {filteredRows.map(row => (
                  <tr key={row.id} className="border-t border-neutral-100">
                    <td className="p-2.5 font-mono">{row.id}</td>
                    <td className="p-2.5">{row.name}</td>
                    <td className="p-2.5 text-right font-semibold">{formatMoney(row.amount)}</td>
                    <td className="p-2.5 text-neutral-500">{row.description}</td>
                    <td className="p-2.5"><button type="button" onClick={() => togglePaid(row.id)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${row.status === 'Đã thu' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}><Check className="w-3 h-3" />{row.status}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            Lưu ý: trạng thái “Đã thu” là xác nhận thủ công trong V1. Không nên dùng trạng thái này như bằng chứng giao dịch ngân hàng.
          </div>
        </section>
      )}
    </div>
  );
};
