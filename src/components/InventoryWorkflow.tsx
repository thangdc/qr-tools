import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Camera, CheckCircle2, Download, Plus, Printer, Upload, XCircle } from 'lucide-react';
import { useQRScanner } from '../hooks/useQRScanner';
import { BatchPrintItem } from './BatchCardPrintModal';
import { trackEvent } from '../utils/analytics';

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  expectedQty: number;
  actualQty: number;
  location: string;
}

interface InventoryWorkflowProps {
  isPro: boolean;
  onOpenPro: (source?: string) => void;
  onBack: () => void;
  onGenerateAndPrint: (items: BatchPrintItem[]) => void;
}

const SAMPLE = 'Mã hàng\tTên hàng\tĐơn vị\tSố lượng dự kiến\tVị trí\nSP001\tNước suối 500ml\tChai\t24\tKệ A1\nSP002\tBút bi xanh\tCây\t50\tKệ A2\nSP003\tGiấy A4\tRam\t10\tKệ B1';

function parseInventory(value: string): InventoryItem[] {
  const rows = value.trim().split(/\r?\n/).map(line => line.split(/\t|,/).map(v => v.trim().replace(/^"|"$/g, ''))).filter(row => row.some(Boolean));
  if (rows.length < 2) return [];
  const headers = rows[0].map(v => v.toLowerCase());
  const idIndex = headers.findIndex(v => ['mã hàng', 'ma hang', 'mã', 'ma', 'sku', 'code'].includes(v));
  const nameIndex = headers.findIndex(v => ['tên hàng', 'ten hang', 'tên', 'ten', 'name'].includes(v));
  const unitIndex = headers.findIndex(v => ['đơn vị', 'don vi', 'unit'].includes(v));
  const qtyIndex = headers.findIndex(v => ['số lượng dự kiến', 'so luong du kien', 'số lượng', 'so luong', 'qty', 'quantity'].includes(v));
  const locationIndex = headers.findIndex(v => ['vị trí', 'vi tri', 'location', 'kệ', 'ke'].includes(v));
  if (idIndex < 0 || nameIndex < 0 || qtyIndex < 0) return [];
  return rows.slice(1).flatMap(row => {
    const id = row[idIndex]?.trim();
    const name = row[nameIndex]?.trim();
    const expectedQty = Number(row[qtyIndex]?.replace(/[^0-9.-]/g, ''));
    if (!id || !name || !Number.isFinite(expectedQty) || expectedQty < 0) return [];
    return [{ id, name, unit: unitIndex >= 0 ? row[unitIndex] || '' : '', expectedQty, actualQty: 0, location: locationIndex >= 0 ? row[locationIndex] || '' : '' }];
  });
}

function encodeInventory(item: InventoryItem) {
  return JSON.stringify({ v: 1, type: 'inventory', id: item.id, name: item.name, unit: item.unit, location: item.location });
}

function decodeInventory(raw: string): { id: string; name?: string } | null {
  try {
    const data = JSON.parse(raw);
    if (data?.type !== 'inventory' || !data.id) return null;
    return { id: String(data.id), name: data.name ? String(data.name) : undefined };
  } catch {
    return raw.trim() ? { id: raw.trim() } : null;
  }
}

function playScanBeep(status: 'success' | 'complete' | 'unknown') {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const tones = status === 'success'
      ? [{ f: 880, s: 0, d: 0.09 }]
      : status === 'complete'
        ? [{ f: 880, s: 0, d: 0.07 }, { f: 1040, s: 0.1, d: 0.1 }]
        : [{ f: 260, s: 0, d: 0.16 }];
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, now);
    tones.forEach(t => {
      osc.frequency.setValueAtTime(t.f, now + t.s);
      gain.gain.setValueAtTime(0.12, now + t.s);
      gain.linearRampToValueAtTime(0.0001, now + t.s + t.d);
    });
    osc.start(now);
    osc.stop(now + tones[tones.length - 1].s + tones[tones.length - 1].d + 0.02);
    osc.addEventListener('ended', () => void ctx.close());
  } catch {}
}

export const InventoryWorkflow: React.FC<InventoryWorkflowProps> = ({ isPro, onOpenPro, onBack, onGenerateAndPrint }) => {
  const [step, setStep] = useState<'data' | 'print' | 'scan' | 'result'>('data');
  const [input, setInput] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lastResult, setLastResult] = useState<{ item?: InventoryItem; status: 'success' | 'complete' | 'unknown' } | null>(null);
  const [scanned, setScanned] = useState<{ id: string; name: string; qty: number; at: number }[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const handleImageUpload = async (file?: File) => {
    if (!file) return;
    const raw = await scanFile(file);
    if (!raw) setError('Không tìm thấy mã QR trong ảnh.');
    else setError('');
  };

  const totalExpected = useMemo(() => items.reduce((sum, item) => sum + item.expectedQty, 0), [items]);
  const totalActual = useMemo(() => items.reduce((sum, item) => sum + item.actualQty, 0), [items]);
  const matched = useMemo(() => items.filter(item => item.actualQty === item.expectedQty).length, [items]);

  const handleScan = (raw: string) => {
    const decoded = decodeInventory(raw);
    if (!decoded) {
      setLastResult({ status: 'unknown' });
      playScanBeep('unknown');
      trackEvent('workflow_inventory_scanned', { status: 'unknown' });
      return;
    }
    const item = items.find(i => i.id.toLowerCase() === decoded.id.toLowerCase());
    if (!item) {
      setLastResult({ status: 'unknown' });
      playScanBeep('unknown');
      trackEvent('workflow_inventory_scanned', { status: 'unknown' });
      return;
    }

    const nextQty = item.actualQty + 1;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, actualQty: nextQty } : i));
    const updated = { ...item, actualQty: nextQty };
    const complete = nextQty === item.expectedQty;
    setLastResult({ item: updated, status: complete ? 'complete' : 'success' });
    playScanBeep(complete ? 'complete' : 'success');
    setScanned(prev => [...prev, { id: item.id, name: item.name, qty: nextQty, at: Date.now() }]);
    trackEvent('workflow_inventory_scanned', { item_id: item.id, status: complete ? 'matched' : 'counted', actual_qty: nextQty });
  };

  const { videoRef, isCameraActive: cameraActive, cameraError, startCamera, stopCamera, scanFile } = useQRScanner({
    onDecoded: handleScan,
    stopAfterDecode: false,
  });

  const importItems = () => {
    const parsed = parseInventory(input);
    if (!parsed.length) {
      setError('Cần có cột Mã hàng, Tên hàng và Số lượng dự kiến.');
      return;
    }
    setError('');
    setItems(parsed);
    setScanned([]);
    setLastResult(null);
    setStep('print');
    trackEvent('workflow_inventory_started', { count: parsed.length });
  };

  const buildPrintItems = () => items.map(item => ({
    id: item.id,
    label: item.name,
    payload: encodeInventory(item),
    type: 'text' as const,
    subtitle: [item.id, item.location].filter(Boolean).join(' · '),
  }));

  const handlePrint = () => {
    if (!isPro) {
      onOpenPro('workflow_inventory_print');
      return;
    }
    onGenerateAndPrint(buildPrintItems());
    trackEvent('workflow_inventory_qr_print_opened', { count: items.length });
  };

  const exportCsv = () => {
    const header = ['Mã hàng', 'Tên hàng', 'Đơn vị', 'Số lượng dự kiến', 'Số lượng thực tế', 'Chênh lệch', 'Vị trí', 'Kết quả'];
    const rows = items.map(item => [
      item.id, item.name, item.unit, item.expectedQty, item.actualQty,
      item.actualQty - item.expectedQty, item.location,
      item.actualQty === item.expectedQty ? 'Khớp' : item.actualQty < item.expectedQty ? 'Thiếu' : 'Thừa',
    ]);
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kiem-ke-hang-hoa-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent('workflow_inventory_exported', { count: items.length });
  };

  const reset = () => {
    stopCamera();
    setStep('data');
    setInput('');
    setItems([]);
    setScanned([]);
    setLastResult(null);
    setQuery('');
    setError('');
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter(item => [item.id, item.name, item.unit, item.location].some(v => v.toLowerCase().includes(q))) : items;
  }, [items, query]);

  const goToResult = () => {
    stopCamera();
    setStep('result');
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <button type="button" onClick={() => { stopCamera(); onBack(); }} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 mb-2 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Quay lại Workflows</button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">📋 Kiểm kê hàng hóa</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">Danh sách → QR → quét để đếm → đối chiếu số lượng → xuất kết quả.</p>
        </div>
        {step !== 'data' && <div className="text-right"><div className="text-xl font-bold text-neutral-900">{totalActual}/{totalExpected}</div><div className="text-[11px] text-neutral-500">đã kiểm kê</div></div>}
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-[11px] sm:text-xs">
        {(['data', 'print', 'scan', 'result'] as const).map((item, i) => (
          <div key={item} className={`rounded-lg px-2 py-2 text-center font-medium ${step === item ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
            {i + 1}. {item === 'data' ? 'Nhập danh sách' : item === 'print' ? 'Tạo & in QR' : item === 'scan' ? 'Kiểm kê' : 'Kết quả'}
          </div>
        ))}
      </div>

      {step === 'data' && (
        <div className="grid md:grid-cols-[1fr_280px] gap-5">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">1. Nhập danh sách</h2>
              <button type="button" onClick={() => setInput(SAMPLE)} className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">Dùng dữ liệu mẫu</button>
            </div>
            <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={SAMPLE} rows={9} className="w-full min-h-52 p-3 rounded-xl border border-neutral-200 bg-neutral-50 font-mono text-xs focus:outline-hidden focus:border-neutral-900" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-neutral-500">Bắt buộc: Mã hàng, Tên hàng, Số lượng dự kiến.</span>
              <button type="button" onClick={importItems} disabled={!input.trim()} className="h-9 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer disabled:opacity-40">Tiếp tục <ArrowRight className="w-3.5 h-3.5 inline ml-0.5" /></button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <aside className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 space-y-3">
            <h2 className="text-sm font-semibold">Bạn có sẵn Excel?</h2>
            <p className="text-xs text-neutral-500 leading-5">Mở Excel, chọn vùng dữ liệu rồi copy/paste vào đây.</p>
            <div className="text-xs font-mono bg-white border border-neutral-200 rounded-lg p-3 overflow-auto">{SAMPLE}</div>
          </aside>
        </div>
      )}

      {step === 'print' && (
        <div className="max-w-2xl mx-auto bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 space-y-5">
          <div>
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Bước 2</p>
            <h2 className="text-lg font-bold text-neutral-900 mt-1">Tạo & in QR cho hàng hóa</h2>
            <p className="text-sm text-neutral-500 mt-1">Đã có <strong className="text-neutral-900">{items.length} mặt hàng</strong>. Mỗi mã QR đại diện cho một mã hàng.</p>
          </div>
          <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-xs text-neutral-600 space-y-1.5">
            <p>• In QR và dán lên thùng, kệ hoặc khu vực hàng hóa.</p>
            <p>• Khi kiểm kê, quét cùng một mã nhiều lần để đếm số lượng thực tế.</p>
          </div>
          <div className="overflow-x-auto border border-neutral-200 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-neutral-50 text-neutral-500"><tr>{['Mã', 'Tên hàng', 'Đơn vị', 'Dự kiến', 'Vị trí'].map(h => <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{items.map(item => <tr key={item.id} className="border-t border-neutral-100"><td className="px-3 py-2 font-mono">{item.id}</td><td className="px-3 py-2 font-medium">{item.name}</td><td className="px-3 py-2">{item.unit}</td><td className="px-3 py-2">{item.expectedQty}</td><td className="px-3 py-2">{item.location}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-center sm:justify-end gap-2">
            <button type="button" onClick={handlePrint} className="h-10 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><Printer className="w-3.5 h-3.5" />Tạo & in QR {isPro ? '' : 'Pro'}</button>
            <button type="button" onClick={() => setStep('scan')} className="h-10 px-4 rounded-lg bg-white border border-neutral-300 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">Tôi đã có QR <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button type="button" onClick={() => setStep('data')} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Quay lại danh sách</button>
            <button type="button" onClick={() => setStep('scan')} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">Tiếp tục kiểm kê <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

      {step === 'scan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => { stopCamera(); setStep('print'); }} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Quay lại tạo & in QR</button>
            <button type="button" onClick={goToResult} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">Kết quả <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-5">
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
              <div className="relative aspect-video bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center">
                {cameraActive ? <video ref={videoRef} playsInline muted className="w-full h-full object-cover" /> : <div className="text-center text-neutral-400"><Camera className="w-10 h-10 mx-auto mb-2" /><p className="text-xs">Bấm bắt đầu để quét</p></div>}
                {cameraActive && <div className="absolute inset-[12%] border-2 border-white/80 rounded-2xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]"><span className="absolute -top-0.5 -left-0.5 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg" /><span className="absolute -top-0.5 -right-0.5 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg" /><span className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg" /><span className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg" /><div className="absolute left-1/2 top-1/2 w-[70%] h-0.5 -translate-x-1/2 -translate-y-1/2 bg-white/70" /></div>}
              </div>
              {cameraError && <div className="text-xs text-red-600">{cameraError}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={cameraActive ? stopCamera : startCamera} className={`flex-1 h-9 rounded-lg text-xs font-semibold cursor-pointer ${cameraActive ? 'bg-red-600 text-white' : 'bg-neutral-900 text-white'}`}>{cameraActive ? 'Dừng camera' : 'Bắt đầu quét'}</button>
                <label className="flex-1 h-9 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"><Upload className="w-3.5 h-3.5" />Quét bằng ảnh<input type="file" accept="image/*" className="hidden" onChange={e => void handleImageUpload(e.target.files?.[0])} /></label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                {!lastResult ? <div className="py-8 text-center text-neutral-400 text-xs">Đang chờ quét...</div> : lastResult.status === 'success' ? (
                  <div className="text-center py-5"><CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" /><p className="mt-2 text-xs font-semibold text-emerald-700">ĐÃ ĐẾM</p><p className="text-lg font-bold text-neutral-900 mt-1">{lastResult.item?.name}</p><p className="text-xs text-neutral-500">{lastResult.item?.id} · {lastResult.item?.actualQty} {lastResult.item?.unit}</p><p className="text-[11px] text-neutral-400 mt-2">Dự kiến: {lastResult.item?.expectedQty}</p></div>
                ) : lastResult.status === 'complete' ? (
                  <div className="text-center py-5"><CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" /><p className="mt-2 text-xs font-semibold text-emerald-700">ĐÃ ĐỦ SỐ LƯỢNG</p><p className="text-lg font-bold text-neutral-900 mt-1">{lastResult.item?.name}</p><p className="text-xs text-neutral-500">{lastResult.item?.actualQty} / {lastResult.item?.expectedQty} {lastResult.item?.unit}</p></div>
                ) : (
                  <div className="text-center py-5"><XCircle className="w-10 h-10 mx-auto text-red-600" /><p className="mt-2 text-xs font-semibold text-red-700">KHÔNG TÌM THẤY</p><p className="text-xs text-neutral-500 mt-2">QR này không thuộc danh sách.</p></div>
                )}
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Tiến độ</h2><span className="text-xs text-neutral-500">{totalActual}/{totalExpected}</span></div>
                <div className="h-2 rounded-full bg-neutral-100 mt-3 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${totalExpected ? Math.min(100, totalActual / totalExpected * 100) : 0}%` }} /></div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs"><div className="rounded-lg bg-neutral-50 p-2 text-center"><div className="font-bold text-neutral-900">{matched}</div><div className="text-neutral-500">Mặt hàng khớp</div></div><div className="rounded-lg bg-neutral-50 p-2 text-center"><div className="font-bold text-neutral-900">{items.length - matched}</div><div className="text-neutral-500">Chưa khớp</div></div></div>
                <button type="button" onClick={goToResult} className="w-full mt-4 h-9 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer">Xem kết quả</button>
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <h2 className="text-sm font-semibold">Quét gần đây</h2>
                <div className="mt-3 space-y-2 max-h-44 overflow-auto">
                  {scanned.slice(-8).reverse().map((scan, i) => <div key={`${scan.id}-${scan.at}-${i}`} className="flex items-center justify-between text-xs"><span className="truncate mr-2">{scan.id} · {scan.name}</span><span className="text-emerald-600 shrink-0">×{scan.qty}</span></div>)}
                  {!scanned.length && <p className="text-xs text-neutral-400">Chưa có lượt quét.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'result' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-sm font-semibold">Kết quả kiểm kê</h2><p className="text-xs text-neutral-500 mt-1">{matched}/{items.length} mặt hàng khớp số lượng.</p></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={exportCsv} className="h-9 px-3 rounded-lg border border-neutral-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><Download className="w-3.5 h-3.5" />Xuất CSV</button><button type="button" onClick={() => setStep('scan')} className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><Camera className="w-3.5 h-3.5" />Kiểm kê tiếp</button></div>
          </div>
          <div className="relative">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm mã, tên hàng, vị trí..." className="w-full h-9 px-3 rounded-lg border border-neutral-200 text-xs outline-none focus:border-neutral-400" />
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-neutral-50 text-neutral-500"><tr>{['Mã', 'Tên hàng', 'Đơn vị', 'Dự kiến', 'Thực tế', 'Chênh lệch', 'Kết quả'].map(h => <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{filtered.map(item => {
                const diff = item.actualQty - item.expectedQty;
                return <tr key={item.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2 font-mono">{item.id}</td>
                  <td className="px-3 py-2 font-medium">{item.name}</td>
                  <td className="px-3 py-2">{item.unit || '—'}</td>
                  <td className="px-3 py-2">{item.expectedQty}</td>
                  <td className="px-3 py-2 font-semibold">{item.actualQty}</td>
                  <td className="px-3 py-2">{diff === 0 ? '0' : diff > 0 ? `+${diff}` : diff}</td>
                  <td className="px-3 py-2">{diff === 0 ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" />Khớp</span> : diff < 0 ? <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="w-3.5 h-3.5" />Thiếu</span> : <span className="inline-flex items-center gap-1 text-red-700"><Plus className="w-3.5 h-3.5" />Thừa</span>}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => setStep('scan')} className="h-9 px-3 rounded-lg bg-neutral-100 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Quay lại kiểm kê</button>
            <button type="button" onClick={reset} className="text-xs text-neutral-500 hover:text-neutral-900 cursor-pointer">Bắt đầu workflow mới</button>
          </div>
        </div>
      )}
    </div>
  );
};
