import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Camera, CheckCircle2, Download, Home, Printer, Upload, XCircle } from 'lucide-react';
import { useQRScanner } from '../hooks/useQRScanner';
import { BatchPrintItem } from './BatchCardPrintModal';
import { trackEvent } from '../utils/analytics';

interface Room {
  id: string;
  name: string;
  property: string;
  tenant: string;
  phone: string;
  status: string;
  note: string;
  scannedAt?: number;
}

interface RoomWorkflowProps {
  isPro: boolean;
  onOpenPro: (source?: string) => void;
  onBack: () => void;
  onGenerateAndPrint: (items: BatchPrintItem[]) => void;
}

const SAMPLE = 'Mã phòng\tTên phòng\tTòa nhà\tNgười thuê\tSố điện thoại\tTrạng thái\tGhi chú\nP101\tPhòng 101\tChung cư A\tNguyễn Văn A\t0901234567\tĐang thuê\t2 người\nP102\tPhòng 102\tChung cư A\tTrần Thị B\t0912345678\tĐang thuê\t\nP201\tPhòng 201\tChung cư A\t\t\tTrống\tSẵn sàng cho thuê';

function parseRooms(value: string): Room[] {
  const rows = value.trim().split(/\r?\n/).map(line => line.split(/\t|,/).map(v => v.trim().replace(/^"|"$/g, ''))).filter(row => row.some(Boolean));
  if (rows.length < 2) return [];
  const headers = rows[0].map(v => v.toLowerCase());
  const find = (names: string[]) => headers.findIndex(v => names.includes(v));
  const idIndex = find(['mã phòng', 'ma phong', 'mã', 'ma', 'room code', 'code']);
  const nameIndex = find(['tên phòng', 'ten phong', 'tên', 'ten', 'room', 'name']);
  const propertyIndex = find(['tòa nhà', 'toa nha', 'tòa', 'toa', 'chung cư', 'chung cu', 'property', 'building']);
  const tenantIndex = find(['người thuê', 'nguoi thue', 'khách thuê', 'khach thue', 'tenant']);
  const phoneIndex = find(['số điện thoại', 'so dien thoai', 'sđt', 'sdt', 'phone']);
  const statusIndex = find(['trạng thái', 'trang thai', 'status']);
  const noteIndex = find(['ghi chú', 'ghi chu', 'note']);
  if (idIndex < 0 || nameIndex < 0) return [];
  return rows.slice(1).flatMap(row => {
    const id = row[idIndex]?.trim();
    const name = row[nameIndex]?.trim();
    if (!id || !name) return [];
    return [{
      id,
      name,
      property: propertyIndex >= 0 ? row[propertyIndex] || '' : '',
      tenant: tenantIndex >= 0 ? row[tenantIndex] || '' : '',
      phone: phoneIndex >= 0 ? row[phoneIndex] || '' : '',
      status: statusIndex >= 0 ? row[statusIndex] || 'Trống' : 'Trống',
      note: noteIndex >= 0 ? row[noteIndex] || '' : '',
    }];
  });
}

function encodeRoom(room: Room) {
  return JSON.stringify({
    v: 1,
    type: 'room',
    id: room.id,
    name: room.name,
    property: room.property,
    tenant: room.tenant,
    phone: room.phone,
    status: room.status,
    note: room.note,
  });
}

function decodeRoom(raw: string): { id: string } | null {
  try {
    const data = JSON.parse(raw);
    if (data?.type !== 'room' || !data.id) return null;
    return { id: String(data.id) };
  } catch {
    return raw.trim() ? { id: raw.trim() } : null;
  }
}

function playScanBeep(status: 'success' | 'unknown') {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(status === 'success' ? 880 : 260, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.setValueAtTime(0.0001, now + (status === 'success' ? 0.09 : 0.16));
    osc.start(now);
    osc.stop(now + (status === 'success' ? 0.11 : 0.18));
    osc.addEventListener('ended', () => void ctx.close());
  } catch {}
}

export const RoomWorkflow: React.FC<RoomWorkflowProps> = ({ isPro, onOpenPro, onBack, onGenerateAndPrint }) => {
  const [step, setStep] = useState<'data' | 'print' | 'scan' | 'result'>('data');
  const [input, setInput] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [lastResult, setLastResult] = useState<{ room?: Room; status: 'success' | 'unknown' } | null>(null);
  const [scanned, setScanned] = useState<{ id: string; name: string; at: number }[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [scanPaused, setScanPaused] = useState(false);

  const total = rooms.length;
  const scannedCount = rooms.filter(room => room.scannedAt).length;

  const pauseAfterScan = (duration = 1500) => {
    setScanPaused(true);
    window.setTimeout(() => setScanPaused(false), duration);
  };

  const handleScan = (raw: string) => {
    if (!isPro) { stopCamera(); onOpenPro('workflow_room_scan'); return; }
    if (scanPaused) return;
    const decoded = decodeRoom(raw);
    if (!decoded) {
      setLastResult({ status: 'unknown' });
      playScanBeep('unknown');
      trackEvent('workflow_room_scanned', { status: 'unknown' });
      pauseAfterScan();
      return;
    }
    const room = rooms.find(item => item.id.toLowerCase() === decoded.id.toLowerCase());
    if (!room) {
      setLastResult({ status: 'unknown' });
      playScanBeep('unknown');
      trackEvent('workflow_room_scanned', { status: 'unknown' });
      pauseAfterScan();
      return;
    }

    const alreadyScanned = Boolean(room.scannedAt);
    const updated = { ...room, scannedAt: Date.now() };
    setRooms(prev => prev.map(item => item.id === room.id ? updated : item));
    setLastResult({ room: updated, status: 'success' });
    playScanBeep('success');
    setScanned(prev => [{ id: room.id, name: room.name, at: updated.scannedAt! }, ...prev.filter(item => item.id !== room.id)].slice(0, 8));
    trackEvent('workflow_room_scanned', { room_id: room.id, status: alreadyScanned ? 'duplicate' : 'success' });
    pauseAfterScan(alreadyScanned ? 1800 : 1500);
  };

  const handleImageUpload = async (file?: File) => {
    if (!isPro) { onOpenPro('workflow_room_scan'); return; }
    if (!file) return;
    const raw = await scanFile(file);
    if (!raw) setError('Không tìm thấy mã QR trong ảnh.');
    else setError('');
  };

  const { videoRef, isCameraActive: cameraActive, cameraError, startCamera, stopCamera, scanFile } = useQRScanner({
    onDecoded: handleScan,
    stopAfterDecode: false,
  });
  const goToScan = () => { if (!isPro) { onOpenPro('workflow_room_scan'); return; } setStep('scan'); };
  const handleStartScan = () => { if (!isPro) { onOpenPro('workflow_room_scan'); return; } void startCamera(); };

  const importRooms = () => {
    const parsed = parseRooms(input);
    if (!parsed.length) {
      setError('Cần có ít nhất cột Mã phòng và Tên phòng.');
      return;
    }
    setError('');
    setRooms(parsed);
    setScanned([]);
    setLastResult(null);
    setStep('print');
    trackEvent('workflow_room_started', { count: parsed.length });
  };

  const buildPrintItems = () => rooms.map(room => ({
    id: room.id,
    label: room.name,
    payload: encodeRoom(room),
    type: 'text' as const,
    subtitle: [room.id, room.property].filter(Boolean).join(' · '),
  }));

  const handlePrint = () => {
    if (!isPro) {
      onOpenPro('workflow_room_print');
      return;
    }
    onGenerateAndPrint(buildPrintItems());
    trackEvent('workflow_room_qr_print_opened', { count: rooms.length });
  };

  const exportCsv = () => {
    const header = ['Mã phòng', 'Tên phòng', 'Tòa nhà', 'Người thuê', 'Số điện thoại', 'Trạng thái', 'Ghi chú', 'Đã quét'];
    const rows = rooms.map(room => [room.id, room.name, room.property, room.tenant, room.phone, room.status, room.note, room.scannedAt ? 'Đã quét' : 'Chưa quét']);
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quan-ly-phong-can-ho-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent('workflow_room_exported', { count: rooms.length });
  };

  const reset = () => {
    stopCamera();
    setScanPaused(false);
    setStep('data');
    setInput('');
    setRooms([]);
    setScanned([]);
    setLastResult(null);
    setQuery('');
    setError('');
  };

  const goToResult = () => {
    stopCamera();
    setStep('result');
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rooms.filter(room => [room.id, room.name, room.property, room.tenant, room.status].some(v => v.toLowerCase().includes(q))) : rooms;
  }, [rooms, query]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <button type="button" onClick={() => { stopCamera(); onBack(); }} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 mb-2 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Quay lại Workflows</button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">🏠 Quản lý phòng / căn hộ</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">Danh sách → QR → quét để tra cứu → ghi nhận phòng đã kiểm tra → xuất kết quả.</p>
        </div>
        {step !== 'data' && <div className="text-right"><div className="text-xl font-bold text-neutral-900">{scannedCount}/{total}</div><div className="text-[11px] text-neutral-500">đã kiểm tra</div></div>}
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-[11px] sm:text-xs">
        {(['data', 'print', 'scan', 'result'] as const).map((item, i) => (
          <div key={item} className={`rounded-lg px-2 py-2 text-center font-medium ${step === item ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
            {i + 1}. {item === 'data' ? 'Nhập danh sách' : item === 'print' ? 'Tạo & in QR' : item === 'scan' ? 'Tra cứu' : 'Kết quả'}
          </div>
        ))}
      </div>

      {step === 'data' && (
        <div className="grid md:grid-cols-[1fr_280px] gap-5">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">1. Nhập danh sách phòng</h2>
              <button type="button" onClick={() => setInput(SAMPLE)} className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">Dùng dữ liệu mẫu</button>
            </div>
            <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={SAMPLE} rows={9} className="w-full min-h-52 p-3 rounded-xl border border-neutral-200 bg-neutral-50 font-mono text-xs focus:outline-hidden focus:border-neutral-900" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-neutral-500">Bắt buộc: Mã phòng, Tên phòng.</span>
              <button type="button" onClick={importRooms} disabled={!input.trim()} className="h-9 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer disabled:opacity-40">Tiếp tục <ArrowRight className="w-3.5 h-3.5 inline ml-0.5" /></button>
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
            <h2 className="text-lg font-bold text-neutral-900 mt-1">Tạo & in QR cho phòng</h2>
            <p className="text-sm text-neutral-500 mt-1">Đã có <strong className="text-neutral-900">{rooms.length} phòng</strong>. Mỗi mã QR đại diện cho một phòng.</p>
          </div>
          <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-xs text-neutral-600 space-y-1.5">
            <p>• Dán QR ở cửa phòng hoặc khu vực cần tra cứu.</p>
            <p>• Quét QR để xem thông tin phòng trong danh sách đã nhập.</p>
            <p>• Không đưa dữ liệu nhạy cảm lên QR nếu nhãn có thể bị người ngoài nhìn thấy.</p>
          </div>
          <div className="overflow-x-auto border border-neutral-200 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-neutral-50 text-neutral-500"><tr>{['Mã', 'Phòng', 'Tòa nhà', 'Người thuê', 'Trạng thái'].map(h => <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{rooms.map(room => <tr key={room.id} className="border-t border-neutral-100"><td className="px-3 py-2 font-mono">{room.id}</td><td className="px-3 py-2 font-medium">{room.name}</td><td className="px-3 py-2">{room.property}</td><td className="px-3 py-2">{room.tenant || '—'}</td><td className="px-3 py-2">{room.status}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-center sm:justify-end gap-2">
            <button type="button" onClick={handlePrint} className="h-10 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><Printer className="w-3.5 h-3.5" />Tạo & in QR {isPro ? '' : 'Pro'}</button>
            <button type="button" onClick={goToScan} className="h-10 px-4 rounded-lg bg-white border border-neutral-300 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">Tôi đã có QR <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button type="button" onClick={() => setStep('data')} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Quay lại danh sách</button>
            <button type="button" onClick={() => setStep('scan')} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">Tiếp tục tra cứu <ArrowRight className="w-3.5 h-3.5" /></button>
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
                {cameraActive ? <video ref={videoRef} playsInline muted className="w-full h-full object-cover" /> : <div className="text-center text-neutral-400"><Home className="w-10 h-10 mx-auto mb-2" /><p className="text-xs">Bấm bắt đầu để quét QR phòng</p></div>}
                {cameraActive && scanPaused && <div className="absolute inset-0 z-10 bg-black/45 flex items-center justify-center"><div className="rounded-xl bg-black/75 px-4 py-3 text-center text-white"><p className="text-xs font-semibold">Đã tra cứu</p><p className="text-[11px] text-white/70 mt-1">Chuẩn bị quét tiếp...</p></div></div>}
                {cameraActive && <div className="absolute inset-[12%] border-2 border-white/80 rounded-2xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]"><span className="absolute -top-0.5 -left-0.5 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg" /><span className="absolute -top-0.5 -right-0.5 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg" /><span className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg" /><span className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg" /><div className="absolute left-1/2 top-1/2 w-[70%] h-0.5 -translate-x-1/2 -translate-y-1/2 bg-white/70" /></div>}
              </div>
              {cameraError && <div className="text-xs text-red-600">{cameraError}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={cameraActive ? stopCamera : handleStartScan} className={`flex-1 h-9 rounded-lg text-xs font-semibold cursor-pointer ${cameraActive ? 'bg-red-600 text-white' : 'bg-neutral-900 text-white'}`}>{cameraActive ? 'Dừng camera' : 'Bắt đầu quét'}</button>
                <label className="flex-1 h-9 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"><Upload className="w-3.5 h-3.5" />Quét bằng ảnh<input type="file" accept="image/*" className="hidden" onChange={e => void handleImageUpload(e.target.files?.[0])} /></label>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                {!lastResult ? <div className="py-8 text-center text-neutral-400 text-xs">Đang chờ quét...</div> : lastResult.status === 'success' ? (
                  <div className="text-center py-5"><CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" /><p className="mt-2 text-xs font-semibold text-emerald-700">ĐÃ TRA CỨU</p><p className="text-lg font-bold text-neutral-900 mt-1">{lastResult.room?.name}</p><p className="text-xs text-neutral-500">{lastResult.room?.id} · {lastResult.room?.property || 'Chưa có tòa nhà'}</p><div className="mt-3 space-y-1 text-xs text-left bg-neutral-50 rounded-lg p-3"><p><strong>Người thuê:</strong> {lastResult.room?.tenant || '—'}</p><p><strong>Trạng thái:</strong> {lastResult.room?.status || '—'}</p><p><strong>SĐT:</strong> {lastResult.room?.phone || '—'}</p>{lastResult.room?.note && <p><strong>Ghi chú:</strong> {lastResult.room.note}</p>}</div></div>
                ) : (
                  <div className="text-center py-5"><XCircle className="w-10 h-10 mx-auto text-red-600" /><p className="mt-2 text-xs font-semibold text-red-700">KHÔNG TÌM THẤY</p><p className="text-xs text-neutral-500 mt-2">QR này không thuộc danh sách phòng.</p></div>
                )}
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Tiến độ</h2><span className="text-xs text-neutral-500">{scannedCount}/{total}</span></div>
                <div className="h-2 rounded-full bg-neutral-100 mt-3 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${total ? scannedCount / total * 100 : 0}%` }} /></div>
                <p className="text-[11px] text-neutral-500 mt-3">Quét mỗi phòng một lần để đánh dấu đã kiểm tra.</p>
                <button type="button" onClick={goToResult} className="w-full mt-4 h-9 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer">Xem kết quả</button>
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <h2 className="text-sm font-semibold">Quét gần đây</h2>
                <div className="mt-3 space-y-2 max-h-44 overflow-auto">
                  {scanned.map(scan => <div key={`${scan.id}-${scan.at}`} className="flex items-center justify-between text-xs"><span className="truncate mr-2">{scan.id} · {scan.name}</span><span className="text-emerald-600 shrink-0">Đã quét</span></div>)}
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
            <div><h2 className="text-sm font-semibold">Kết quả quản lý phòng</h2><p className="text-xs text-neutral-500 mt-1">{scannedCount}/{rooms.length} phòng đã được kiểm tra.</p></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={exportCsv} className="h-9 px-3 rounded-lg border border-neutral-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><Download className="w-3.5 h-3.5" />Xuất CSV</button><button type="button" onClick={() => setStep('scan')} className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><Camera className="w-3.5 h-3.5" />Tra cứu tiếp</button></div>
          </div>
          <div><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm mã phòng, tên phòng, người thuê..." className="w-full h-9 px-3 rounded-lg border border-neutral-200 text-xs outline-none focus:border-neutral-400" /></div>
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-neutral-50 text-neutral-500"><tr>{['Mã', 'Phòng', 'Tòa nhà', 'Người thuê', 'Trạng thái', 'Kiểm tra'].map(h => <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{filtered.map(room => <tr key={room.id} className="border-t border-neutral-100"><td className="px-3 py-2 font-mono">{room.id}</td><td className="px-3 py-2 font-medium">{room.name}</td><td className="px-3 py-2">{room.property || '—'}</td><td className="px-3 py-2">{room.tenant || '—'}</td><td className="px-3 py-2">{room.status}</td><td className="px-3 py-2">{room.scannedAt ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" />Đã kiểm tra</span> : <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="w-3.5 h-3.5" />Chưa kiểm tra</span>}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => setStep('scan')} className="h-9 px-3 rounded-lg bg-neutral-100 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Quay lại tra cứu</button>
            <button type="button" onClick={reset} className="text-xs text-neutral-500 hover:text-neutral-900 cursor-pointer">Bắt đầu workflow mới</button>
          </div>
        </div>
      )}
    </div>
  );
};
