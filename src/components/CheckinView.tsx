import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, Download, Upload, XCircle, AlertTriangle, Printer } from 'lucide-react';
import { useQRScanner } from '../hooks/useQRScanner';
import { trackEvent } from '../utils/analytics';

interface Participant { id: string; name: string; email?: string; phone?: string; checkedInAt?: number; }
interface CheckinViewProps { onBack: () => void; onGenerateAndPrint: (items: { id: string; label: string; payload: string }[]) => void; }

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(timestamp)).replace(',', '');
}


function playScanBeep(status: 'success' | 'duplicate' | 'unknown') {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    const settings = status === 'success'
      ? [{ frequency: 880, start: 0, duration: 0.09 }]
      : status === 'duplicate'
        ? [{ frequency: 520, start: 0, duration: 0.08 }, { frequency: 520, start: 0.11, duration: 0.08 }]
        : [{ frequency: 260, start: 0, duration: 0.16 }];
    oscillator.type = 'sine';
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime(0.0001, now);
    settings.forEach(({ frequency, start, duration }) => {
      oscillator.frequency.setValueAtTime(frequency, now + start);
      gain.gain.setValueAtTime(0.12, now + start);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
    });
    oscillator.start(now);
    oscillator.stop(now + settings[settings.length - 1].start + settings[settings.length - 1].duration + 0.02);
    oscillator.addEventListener('ended', () => void audioContext.close());
  } catch {
    // Audio feedback is optional; scanning must continue if audio is unavailable.
  }
}

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

export const CheckinView: React.FC<CheckinViewProps> = ({ onBack, onGenerateAndPrint }) => {
  const [step, setStep] = useState<'data' | 'print' | 'scan' | 'result'>('data');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rawInput, setRawInput] = useState('');
  const [lastResult, setLastResult] = useState<{ participant?: Participant; status: 'success' | 'duplicate' | 'unknown' } | null>(null);
  const [scanned, setScanned] = useState<{ id: string; at: number; status: 'success' | 'duplicate' }[]>([]);
  const [error, setError] = useState('');

  const checkedIn = useMemo(() => participants.filter(p => p.checkedInAt).length, [participants]);

  const handleScan = (raw: string) => {
    const id = raw.trim();
    const participant = participants.find(p => p.id.toLowerCase() === id.toLowerCase());
    if (!participant) {
      setLastResult({ status: 'unknown' });
      playScanBeep('unknown');
      trackEvent('checkin_scan', { status: 'unknown' });
      return;
    }
    if (participant.checkedInAt) {
      setLastResult({ participant, status: 'duplicate' });
      playScanBeep('duplicate');
      recordScan(participant.id, 'duplicate');
      return;
    }
    const at = Date.now();
    const updated = participants.map(p => p.id === participant.id ? { ...p, checkedInAt: at } : p);
    setParticipants(updated);
    setLastResult({ participant: { ...participant, checkedInAt: at }, status: 'success' });
    playScanBeep('success');
    recordScan(participant.id, 'success');
  };

  const {
    videoRef,
    isCameraActive: cameraActive,
    cameraError,
    startCamera,
    stopCamera,
    scanFile,
  } = useQRScanner({ onDecoded: handleScan, stopAfterDecode: false });

  const scannerError = error || cameraError || '';

  function recordScan(id: string, status: 'success' | 'duplicate') {
    const at = Date.now();
    setScanned(prev => [...prev, { id, at, status }]);
    trackEvent('checkin_scan', { status });
  }

  async function handleImageUpload(file?: File) {
    if (!file) return;
    const raw = await scanFile(file);
    if (!raw) setError('Không tìm thấy mã QR trong ảnh.');
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
    setStep('print');
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

  const restartWorkflow = () => {
    stopCamera();
    setStep('data');
    setParticipants([]);
    setRawInput('');
    setLastResult(null);
    setScanned([]);
    setError('');
  };

  const goToPrint = () => setStep('print');
  const goToScan = () => setStep('scan');
  const goToResult = () => {
    stopCamera();
    setStep('result');
  };

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

      <div className="grid grid-cols-4 gap-1.5 text-[11px] sm:text-xs">
        {(['data','print','scan','result'] as const).map((item, i) => <div key={item} className={`rounded-lg px-2 py-2 text-center font-medium ${step === item ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>{i + 1}. {item === 'data' ? 'Nhập danh sách' : item === 'print' ? 'Tạo & in QR' : item === 'scan' ? 'Check-in' : 'Kết quả'}</div>)}
      </div>

      {step === 'data' && (
        <div className="grid md:grid-cols-[1fr_280px] gap-5">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">1. Nhập danh sách</h2><button type="button" onClick={loadSample} className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">Dùng dữ liệu mẫu</button></div>
            <textarea value={rawInput} onChange={e => setRawInput(e.target.value)} placeholder="Dán từ Excel / Google Sheets...
ID\tHọ tên\tEmail
HV001\tNguyễn Văn A\ta@gmail.com" className="w-full min-h-52 p-3 rounded-xl border border-neutral-200 bg-neutral-50 font-mono text-xs focus:outline-hidden focus:border-neutral-900" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-neutral-500">Bắt buộc: ID, Họ tên. Dán trực tiếp từ Excel vẫn giữ cột.</span>
              <button type="button" onClick={importData} disabled={!rawInput.trim()} className="h-9 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer disabled:opacity-40">Tiếp tục <ArrowRight className="inline w-3.5 h-3.5 ml-0.5" /></button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 space-y-3">
            <h2 className="text-sm font-semibold">Bạn có sẵn Excel?</h2>
            <p className="text-xs text-neutral-500 leading-5">Mở Excel, chọn vùng dữ liệu rồi copy/paste vào đây. Không cần đổi định dạng.</p>
            <div className="text-xs font-mono bg-white border border-neutral-200 rounded-lg p-3 overflow-auto">{SAMPLE}</div>
          </div>
        </div>
      )}

      {step === 'print' && (
        <div className="max-w-2xl mx-auto bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 space-y-5">
          <div>
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Bước 2</p>
            <h2 className="text-lg font-bold text-neutral-900 mt-1">Tạo & in QR cho danh sách</h2>
            <p className="text-sm text-neutral-500 mt-1">Đã có <strong className="text-neutral-900">{participants.length} người</strong>. Mỗi người sẽ có một mã QR chứa ID để dùng khi check-in.</p>
          </div>

          <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-xs text-neutral-600 space-y-1.5">
            <p>• In mã QR và phát cho người tham dự trước sự kiện.</p>
            <p>• Không bắt buộc phải in nếu bạn đã có QR từ trước.</p>
          </div>

          <div className="flex flex-wrap justify-center sm:justify-end gap-2">
            <button type="button" onClick={() => onGenerateAndPrint(participants.map(p => ({ id: p.id, label: p.name, payload: p.id })))} className="h-10 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><Printer className="w-3.5 h-3.5" />Tạo & in QR</button>
            <button type="button" onClick={goToScan} className="h-10 px-4 rounded-lg bg-white border border-neutral-300 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">Tôi đã có QR <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button type="button" onClick={() => setStep('data')} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Quay lại danh sách</button>
            <button type="button" onClick={goToScan} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">Tiếp tục check-in <ArrowRight className="w-3.5 h-3.5" /></button>
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
              {scannerError && <div className="text-xs text-red-600">{scannerError}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={cameraActive ? stopCamera : startCamera} className={`flex-1 h-9 rounded-lg text-xs font-semibold cursor-pointer ${cameraActive ? 'bg-red-600 text-white' : 'bg-neutral-900 text-white'}`}>{cameraActive ? 'Dừng camera' : 'Bắt đầu quét'}</button>
                <label className="flex-1 h-9 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"><Upload className="w-3.5 h-3.5" />Tải ảnh QR<input type="file" accept="image/*" className="hidden" onChange={e => void handleImageUpload(e.target.files?.[0])} /></label>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                {!lastResult ? <div className="py-8 text-center text-neutral-400 text-xs">Đang chờ quét...</div> : lastResult.status === 'success' ? (
                  <div className="text-center py-5"><CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" /><p className="mt-2 text-xs font-semibold text-emerald-700">CHECK-IN THÀNH CÔNG</p><p className="text-lg font-bold text-neutral-900 mt-1">{lastResult.participant?.name}</p><p className="text-xs text-neutral-500">{lastResult.participant?.id}</p><p className="text-[11px] text-neutral-400 mt-2">{formatDateTime(lastResult.participant!.checkedInAt!)}</p></div>
                ) : lastResult.status === 'duplicate' ? (
                  <div className="text-center py-5"><AlertTriangle className="w-10 h-10 mx-auto text-amber-600" /><p className="mt-2 text-xs font-semibold text-amber-700">ĐÃ CHECK-IN</p><p className="text-lg font-bold text-neutral-900 mt-1">{lastResult.participant?.name}</p><p className="text-xs text-neutral-500">{lastResult.participant?.id}</p></div>
                ) : (
                  <div className="text-center py-5"><XCircle className="w-10 h-10 mx-auto text-red-600" /><p className="mt-2 text-xs font-semibold text-red-700">KHÔNG TÌM THẤY</p><p className="text-xs text-neutral-500 mt-2">QR này không thuộc danh sách.</p></div>
                )}
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Tiến độ</h2><span className="text-xs text-neutral-500">{checkedIn}/{participants.length}</span></div>
                <div className="h-2 rounded-full bg-neutral-100 mt-3 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${participants.length ? checkedIn / participants.length * 100 : 0}%` }} /></div>
                <button type="button" onClick={goToResult} className="w-full mt-4 h-9 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer">Xem kết quả</button>
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <h2 className="text-sm font-semibold">Quét gần đây</h2>
                <div className="mt-3 space-y-2 max-h-44 overflow-auto">{scanned.slice(-8).reverse().map((item, i) => <div key={i} className="flex items-center justify-between text-xs"><span className="font-mono">{item.id}</span><span className={item.status === 'success' ? 'text-emerald-600' : 'text-amber-600'}>{item.status === 'success' ? '✓' : '⚠'} {new Date(item.at).toLocaleTimeString('vi-VN')}</span></div>)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'result' && (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          <div className="p-5 flex items-center justify-between gap-3 border-b border-neutral-200"><div><h2 className="text-sm font-semibold">Kết quả</h2><p className="text-xs text-neutral-500 mt-1">{checkedIn}/{participants.length} người đã check-in.</p></div><button type="button" onClick={exportCsv} className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><Download className="w-3.5 h-3.5" />Xuất CSV</button></div>
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-neutral-50"><tr><th className="text-left p-3">ID</th><th className="text-left p-3">Họ tên</th><th className="text-left p-3">Email</th><th className="text-left p-3">Trạng thái</th><th className="text-left p-3">Check-in</th></tr></thead><tbody>{participants.map(p => <tr key={p.id} className="border-t border-neutral-100"><td className="p-3 font-mono">{p.id}</td><td className="p-3 font-medium">{p.name}</td><td className="p-3 text-neutral-500">{p.email || '—'}</td><td className="p-3">{p.checkedInAt ? <span className="text-emerald-600">✓ Đã check-in</span> : <span className="text-neutral-400">Chưa check-in</span>}</td><td className="p-3 text-neutral-500">{p.checkedInAt ? formatDateTime(p.checkedInAt) : '—'}</td></tr>)}</tbody></table></div>
          <div className="p-4 border-t border-neutral-200 flex justify-between gap-2">
            <button type="button" onClick={goToScan} className="h-9 px-3 rounded-lg bg-neutral-100 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Quay lại check-in</button>
            <button type="button" onClick={restartWorkflow} className="h-9 px-3 rounded-lg bg-white border border-neutral-300 text-xs font-semibold cursor-pointer">Bắt đầu lại</button>
          </div>
        </div>
      )}
    </div>
  );
};
