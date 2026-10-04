import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle2, Download, Upload, XCircle, AlertTriangle } from 'lucide-react';
import { scanImageData, scanImageFile } from '../utils/qrDecoder';
import { trackEvent } from '../utils/analytics';

interface Participant { id: string; name: string; email?: string; phone?: string; checkedInAt?: number; }
interface CheckinViewProps { onBack: () => void; }

function parseRows(text: string): Participant[] {
  const rows = text.trim().split(/\r?\n/).map(line => line.split(/\t|,/).map(v => v.trim().replace(/^"|"$/g, ''))).filter(row => row.some(Boolean));
  if (rows.length < 2) return [];
  const headers = rows[0].map(v => v.toLowerCase());
  const idIndex = headers.findIndex(v => ['id', 'mã', 'ma', 'code'].includes(v));
  const nameIndex = headers.findIndex(v => ['họ tên', 'ho ten', 'name', 'tên', 'ten'].includes(v));
  if (idIndex < 0 || nameIndex < 0) return [];
  const emailIndex = headers.findIndex(v => ['email'].includes(v));
  const phoneIndex = headers.findIndex(v => ['sđt', 'sdt', 'phone', 'số điện thoại'].includes(v));
  return rows.slice(1).flatMap(row => {
    const id = row[idIndex]?.trim();
    const name = row[nameIndex]?.trim();
    if (!id || !name) return [];
    return [{ id, name, email: emailIndex >= 0 ? row[emailIndex] : undefined, phone: phoneIndex >= 0 ? row[phoneIndex] : undefined }];
  });
}

const SAMPLE = 'ID\tHọ tên\tEmail\nHV001\tNguyễn Văn A\ta@gmail.com\nHV002\tTrần Văn B\tb@gmail.com\nHV003\tLê Văn C\tc@gmail.com';

export const CheckinView: React.FC<CheckinViewProps> = ({ onBack }) => {
  const [step, setStep] = useState<'data' | 'scan' | 'result'>('data');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rawInput, setRawInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [lastResult, setLastResult] = useState<{ participant?: Participant; status: 'success' | 'duplicate' | 'unknown' } | null>(null);
  const [scanned, setScanned] = useState<{ id: string; at: number; status: 'success' | 'duplicate' }[]>([]);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  const checkedIn = useMemo(() => participants.filter(p => p.checkedInAt).length, [participants]);

  useEffect(() => () => stopCamera(), []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    busyRef.current = false;
    setCameraActive(false);
  }

  async function startCamera() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      setError('Không thể truy cập camera. Hãy cấp quyền camera hoặc dùng tải ảnh QR.');
    }
  }

  useEffect(() => {
    if (!cameraActive || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().then(() => scanFrame()).catch(() => setError('Không thể phát camera.'));
  }, [cameraActive]);

  function scanFrame() {
    if (busyRef.current) return;
    busyRef.current = true;
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      busyRef.current = false;
      frameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const raw = scanImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (raw) {
        handleScan(raw);
        busyRef.current = false;
        return;
      }
    }
    busyRef.current = false;
    frameRef.current = requestAnimationFrame(scanFrame);
  }

  function recordScan(id: string, status: 'success' | 'duplicate') {
    const at = Date.now();
    setScanned(prev => [...prev, { id, at, status }]);
    trackEvent('checkin_scan', { status });
  }

  function handleScan(raw: string) {
    const id = raw.trim();
    const participant = participants.find(p => p.id.toLowerCase() === id.toLowerCase());
    if (!participant) {
      setLastResult({ status: 'unknown' });
      trackEvent('checkin_scan', { status: 'unknown' });
      return;
    }
    if (participant.checkedInAt) {
      setLastResult({ participant, status: 'duplicate' });
      recordScan(participant.id, 'duplicate');
      return;
    }
    const at = Date.now();
    const updated = participants.map(p => p.id === participant.id ? { ...p, checkedInAt: at } : p);
    setParticipants(updated);
    setLastResult({ participant: { ...participant, checkedInAt: at }, status: 'success' });
    recordScan(participant.id, 'success');
  }

  async function handleImageUpload(file?: File) {
    if (!file) return;
    const raw = await scanImageFile(file);
    if (raw) handleScan(raw);
    else setError('Không tìm thấy mã QR trong ảnh.');
  }

  function loadSample() {
    setRawInput(SAMPLE);
    setParticipants(parseRows(SAMPLE));
  }

  function importData() {
    const parsed = parseRows(rawInput);
    if (!parsed.length) {
      setError('Cần có cột ID và Họ tên. Bạn có thể tải dữ liệu mẫu để bắt đầu.');
      return;
    }
    setError('');
    setParticipants(parsed);
    setStep('scan');
    trackEvent('checkin_started', { count: parsed.length });
  }

  function exportCsv() {
    const csv = [
      'ID,Họ tên,Email,Số điện thoại,Trạng thái,Check-in lúc',
      ...participants.map(p => [
        p.id, p.name, p.email || '', p.phone || '',
        p.checkedInAt ? 'Đã check-in' : 'Chưa check-in',
        p.checkedInAt ? new Date(p.checkedInAt).toISOString() : '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `checkin-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
    trackEvent('checkin_exported', { count: participants.length });
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <button type="button" onClick={() => { stopCamera(); onBack(); }} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 mb-2 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Quay lại Workflows</button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">🎟️ Điểm danh / Check-in</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">Upload danh sách → dùng QR để điểm danh → xuất kết quả.</p>
        </div>
        {step !== 'data' && <div className="text-right"><div className="text-xl font-bold text-neutral-900">{checkedIn}/{participants.length}</div><div className="text-[11px] text-neutral-500">đã check-in</div></div>}
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-[11px] sm:text-xs">
        {(['data','scan','result'] as const).map((item, i) => <div key={item} className={`rounded-lg px-3 py-2 text-center font-medium ${step === item ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>{i + 1}. {item === 'data' ? 'Danh sách' : item === 'scan' ? 'Check-in' : 'Kết quả'}</div>)}
      </div>

      {step === 'data' && (
        <div className="grid md:grid-cols-[1fr_280px] gap-5">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">1. Nhập danh sách</h2><button type="button" onClick={loadSample} className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">Dùng dữ liệu mẫu</button></div>
            <textarea value={rawInput} onChange={e => setRawInput(e.target.value)} placeholder="Dán từ Excel / Google Sheets...\nID\tHọ tên\tEmail\nHV001\tNguyễn Văn A\ta@gmail.com" className="w-full min-h-52 p-3 rounded-xl border border-neutral-200 bg-neutral-50 font-mono text-xs focus:outline-hidden focus:border-neutral-900" />
            <div className="flex items-center justify-between gap-3"><span className="text-[11px] text-neutral-500">Bắt buộc: ID, Họ tên. Dán trực tiếp từ Excel vẫn giữ cột.</span><button type="button" onClick={importData} className="h-9 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer">Tiếp tục →</button></div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 space-y-3">
            <h2 className="text-sm font-semibold">Bạn có sẵn Excel?</h2>
            <p className="text-xs text-neutral-500 leading-5">Mở Excel, chọn vùng dữ liệu rồi copy/paste vào đây. Không cần đổi định dạng.</p>
            <div className="text-xs font-mono bg-white border border-neutral-200 rounded-lg p-3 overflow-auto">{SAMPLE}</div>
          </div>
        </div>
      )}

      {step === 'scan' && (
        <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-5">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
            <div className="relative aspect-video bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center">
              {cameraActive ? <video ref={videoRef} playsInline muted className="w-full h-full object-cover" /> : <div className="text-center text-neutral-400"><Camera className="w-10 h-10 mx-auto mb-2" /><p className="text-xs">Bấm bắt đầu để quét</p></div>}
              {cameraActive && <div className="absolute inset-10 border-2 border-white/60 rounded-xl pointer-events-none" />}
            </div>
            {error && <div className="text-xs text-red-600">{error}</div>}
            <div className="flex gap-2">
              <button type="button" onClick={cameraActive ? stopCamera : startCamera} className={`flex-1 h-9 rounded-lg text-xs font-semibold cursor-pointer ${cameraActive ? 'bg-red-600 text-white' : 'bg-neutral-900 text-white'}`}>{cameraActive ? 'Dừng camera' : 'Bắt đầu quét'}</button>
              <label className="flex-1 h-9 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"><Upload className="w-3.5 h-3.5" />Tải ảnh QR<input type="file" accept="image/*" className="hidden" onChange={e => void handleImageUpload(e.target.files?.[0])} /></label>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white border border-neutral-200 rounded-2xl p-5">
              {!lastResult ? <div className="py-8 text-center text-neutral-400 text-xs">Đang chờ quét...</div> : lastResult.status === 'success' ? (
                <div className="text-center py-5"><CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" /><p className="mt-2 text-xs font-semibold text-emerald-700">CHECK-IN THÀNH CÔNG</p><p className="text-lg font-bold text-neutral-900 mt-1">{lastResult.participant?.name}</p><p className="text-xs text-neutral-500">{lastResult.participant?.id}</p><p className="text-[11px] text-neutral-400 mt-2">{new Date(lastResult.participant!.checkedInAt!).toLocaleTimeString('vi-VN')}</p></div>
              ) : lastResult.status === 'duplicate' ? (
                <div className="text-center py-5"><AlertTriangle className="w-10 h-10 mx-auto text-amber-600" /><p className="mt-2 text-xs font-semibold text-amber-700">ĐÃ CHECK-IN</p><p className="text-lg font-bold text-neutral-900 mt-1">{lastResult.participant?.name}</p><p className="text-xs text-neutral-500">{lastResult.participant?.id}</p></div>
              ) : (
                <div className="text-center py-5"><XCircle className="w-10 h-10 mx-auto text-red-600" /><p className="mt-2 text-xs font-semibold text-red-700">KHÔNG TÌM THẤY</p><p className="text-xs text-neutral-500 mt-2">QR này không thuộc danh sách.</p></div>
              )}
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl p-5">
              <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Tiến độ</h2><span className="text-xs text-neutral-500">{checkedIn}/{participants.length}</span></div>
              <div className="h-2 rounded-full bg-neutral-100 mt-3 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${participants.length ? checkedIn / participants.length * 100 : 0}%` }} /></div>
              <button type="button" onClick={() => { stopCamera(); setStep('result'); }} className="w-full mt-4 h-9 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer">Xem kết quả</button>
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl p-5">
              <h2 className="text-sm font-semibold">Quét gần đây</h2>
              <div className="mt-3 space-y-2 max-h-44 overflow-auto">{scanned.slice(-8).reverse().map((item, i) => <div key={i} className="flex items-center justify-between text-xs"><span className="font-mono">{item.id}</span><span className={item.status === 'success' ? 'text-emerald-600' : 'text-amber-600'}>{item.status === 'success' ? '✓' : '⚠'} {new Date(item.at).toLocaleTimeString('vi-VN')}</span></div>)}</div>
            </div>
          </div>
        </div>
      )}

      {step === 'result' && (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          <div className="p-5 flex items-center justify-between gap-3 border-b border-neutral-200"><div><h2 className="text-sm font-semibold">Kết quả</h2><p className="text-xs text-neutral-500 mt-1">{checkedIn}/{participants.length} người đã check-in.</p></div><button type="button" onClick={exportCsv} className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><Download className="w-3.5 h-3.5" />Xuất CSV</button></div>
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-neutral-50"><tr><th className="text-left p-3">ID</th><th className="text-left p-3">Họ tên</th><th className="text-left p-3">Email</th><th className="text-left p-3">Trạng thái</th><th className="text-left p-3">Check-in</th></tr></thead><tbody>{participants.map(p => <tr key={p.id} className="border-t border-neutral-100"><td className="p-3 font-mono">{p.id}</td><td className="p-3 font-medium">{p.name}</td><td className="p-3 text-neutral-500">{p.email || '—'}</td><td className="p-3">{p.checkedInAt ? <span className="text-emerald-600">✓ Đã check-in</span> : <span className="text-neutral-400">Chưa check-in</span>}</td><td className="p-3 text-neutral-500">{p.checkedInAt ? new Date(p.checkedInAt).toLocaleString('vi-VN') : '—'}</td></tr>)}</tbody></table></div>
          <div className="p-4 border-t border-neutral-200 flex justify-end gap-2"><button type="button" onClick={() => { setStep('scan'); setLastResult(null); }} className="h-9 px-3 rounded-lg bg-neutral-100 text-xs font-semibold cursor-pointer">Tiếp tục check-in</button><button type="button" onClick={onBack} className="h-9 px-3 rounded-lg bg-white border border-neutral-300 text-xs font-semibold cursor-pointer">Quay lại Workflows</button></div>
        </div>
      )}
    </div>
  );
};
