import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle2, ClipboardList, Download, Package, Plus, QrCode, Search, Trash2 } from 'lucide-react';
import { useQRScanner } from '../hooks/useQRScanner';
import { BatchPrintItem } from './BatchCardPrintModal';
import { trackEvent } from '../utils/analytics';

interface Asset {
  id: string;
  name: string;
  category: string;
  location: string;
  owner: string;
  status: string;
  note: string;
  checkedAt?: number;
}

interface AssetWorkflowProps {
  isPro: boolean;
  onOpenPro: (source?: string) => void;
  onBack: () => void;
  onGenerateAndPrint: (items: BatchPrintItem[]) => void;
}

const SAMPLE = 'Mã tài sản\tTên tài sản\tLoại\tVị trí\tNgười phụ trách\tTrạng thái\tGhi chú\nTS001\tLaptop Dell\tThiết bị IT\tPhòng IT\tNguyễn Văn A\tĐang sử dụng\tDell Latitude\nTS002\tMáy chiếu Epson\tThiết bị\tPhòng họp\tTrần Văn B\tĐang sử dụng\t\nTS003\tBàn làm việc\tNội thất\tPhòng 201\t\tĐang sử dụng\t';

function parseAssets(value: string): Asset[] {
  return value
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split('\t').map((v) => v.trim()))
    .filter((row) => row[0] && row[1])
    .filter((row, index) => index > 0 || row[0].toLowerCase() !== 'mã tài sản')
    .map((row) => ({
      id: row[0],
      name: row[1],
      category: row[2] || '',
      location: row[3] || '',
      owner: row[4] || '',
      status: row[5] || 'Đang sử dụng',
      note: row[6] || '',
    }));
}

function encodeAsset(asset: Asset) {
  return JSON.stringify({
    v: 1,
    type: 'asset',
    id: asset.id,
    name: asset.name,
    category: asset.category,
    location: asset.location,
    owner: asset.owner,
    status: asset.status,
    note: asset.note,
  });
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

function decodeAsset(raw: string): Asset | null {
  try {
    const data = JSON.parse(raw);
    if (data?.type !== 'asset' || !data.id || !data.name) return null;
    return {
      id: String(data.id),
      name: String(data.name),
      category: String(data.category || ''),
      location: String(data.location || ''),
      owner: String(data.owner || ''),
      status: String(data.status || 'Đang sử dụng'),
      note: String(data.note || ''),
    };
  } catch {
    return null;
  }
}

export const AssetWorkflow: React.FC<AssetWorkflowProps> = ({ isPro, onOpenPro, onBack, onGenerateAndPrint }) => {
  const [step, setStep] = useState(1);
  const [input, setInput] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [query, setQuery] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [lastAsset, setLastAsset] = useState<Asset | null>(null);
  const [scanCount, setScanCount] = useState(0);

  const { videoRef, isCameraActive, cameraError, startCamera, stopCamera } = useQRScanner({
    stopAfterDecode: false,
    onDecoded: (raw) => {
      const asset = decodeAsset(raw);
      if (!asset) {
        setScanMessage('QR này không phải mã tài sản của workflow.');
        playScanBeep('unknown');
        return;
      }

      const existing = assets.find((item) => item.id === asset.id);
      if (existing?.checkedAt) {
        setScanMessage('Tài sản này đã được quét.');
        playScanBeep('duplicate');
        return;
      }

      setAssets((prev) => {
        const current = prev.find((item) => item.id === asset.id);
        if (!current) return [asset, ...prev];
        return prev.map((item) => item.id === asset.id ? { ...item, checkedAt: Date.now() } : item);
      });
      playScanBeep('success');
      setLastAsset(asset);
      setScanCount((count) => count + 1);
      setScanMessage('Đã nhận diện tài sản');
      trackEvent('workflow_asset_scanned', { asset_id: asset.id });
    },
  });

  useEffect(() => () => stopCamera(), [stopCamera]);

  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((asset) =>
      [asset.id, asset.name, asset.category, asset.location, asset.owner, asset.status]
        .some((value) => value.toLowerCase().includes(q))
    );
  }, [assets, query]);

  const importAssets = () => {
    const parsed = parseAssets(input);
    if (!parsed.length) return;
    setAssets(parsed);
    setStep(2);
    trackEvent('workflow_asset_list_imported', { count: parsed.length });
  };

  const buildPrintItems = () => assets.map((asset) => ({
    id: asset.id,
    label: asset.name,
    payload: encodeAsset(asset),
    type: 'text' as const,
    subtitle: [asset.id, asset.location].filter(Boolean).join(' · '),
  }));

  const handlePrint = () => {
    if (!isPro) {
      onOpenPro('workflow_asset_print');
      return;
    }
    onGenerateAndPrint(buildPrintItems());
    trackEvent('workflow_asset_qr_print_opened', { count: assets.length });
  };

  const exportCsv = () => {
    const header = ['Mã tài sản', 'Tên tài sản', 'Loại', 'Vị trí', 'Người phụ trách', 'Trạng thái', 'Ghi chú', 'Lần quét gần nhất'];
    const rows = assets.map((asset) => [
      asset.id, asset.name, asset.category, asset.location, asset.owner, asset.status, asset.note,
      asset.checkedAt ? new Date(asset.checkedAt).toLocaleString('vi-VN') : '',
    ]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tai-san-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent('workflow_asset_exported', { count: assets.length });
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 mb-2 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Quay lại Workflows</button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">📦 Quản lý tài sản</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">Tạo QR cho từng tài sản → dán nhãn → quét để tra cứu và ghi nhận kiểm kê.</p>
        </div>
        {step > 1 && <div className="text-right"><div className="text-xl font-bold text-neutral-900">{assets.filter(a => a.checkedAt).length}/{assets.length}</div><div className="text-[11px] text-neutral-500">đã quét</div></div>}
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-[11px] sm:text-xs">
        {['Nhập danh sách','Tạo & in QR','Quét tài sản','Kết quả'].map((label, i) => <div key={label} className={`rounded-lg px-2 py-2 text-center font-medium ${step === i + 1 ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>{i + 1}. {label}</div>)}
      </div>

      {step === 1 && (
        <div className="grid md:grid-cols-[1fr_280px] gap-5">
          <section className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Danh sách tài sản</h2>
            <p className="text-xs text-neutral-500 mt-1">Copy từ Excel / Google Sheets và dán vào đây. Cột bắt buộc: Mã tài sản, Tên tài sản.</p>
          </div>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={9} placeholder={SAMPLE} className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs font-mono outline-none focus:border-neutral-400" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-neutral-500">Bắt buộc: Mã tài sản, Tên tài sản. Dán trực tiếp từ Excel vẫn giữ cột.</span>
            <div className="flex flex-wrap justify-center sm:justify-end gap-2">
              <button type="button" onClick={() => setInput(SAMPLE)} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold cursor-pointer">Dùng dữ liệu mẫu</button>
              <button type="button" onClick={importAssets} disabled={!parseAssets(input).length} className="h-9 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                Tiếp tục <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          </div>
          </section>
          <aside className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 space-y-3">
          <h2 className="text-sm font-semibold">Bạn có sẵn Excel?</h2>
          <p className="text-xs text-neutral-500 leading-5">Mở Excel, chọn vùng dữ liệu rồi copy/paste vào đây. Không cần đổi định dạng.</p>
          <div className="text-xs font-mono bg-white border border-neutral-200 rounded-lg p-3 overflow-auto">{SAMPLE}</div>
          </aside>
        </div>
      )}

      {step === 2 && (
        <section className="max-w-2xl mx-auto bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Tạo QR cho tài sản</h2>
              <p className="text-xs text-neutral-500 mt-1">{assets.length} tài sản đã sẵn sàng.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setStep(1)} className="h-9 px-3 rounded-lg border border-neutral-200 text-xs font-medium cursor-pointer">← Quay lại</button>
              <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer">
                <QrCode className="w-3.5 h-3.5" /> Tạo & in QR {isPro ? '' : 'Pro'}
              </button>
              <button type="button" onClick={() => setStep(3)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-neutral-200 text-xs font-semibold cursor-pointer">
                Tôi đã có QR →
              </button>
            </div>
          </div>
          <div className="overflow-x-auto border border-neutral-200 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-neutral-50 text-neutral-500"><tr>{['Mã', 'Tên tài sản', 'Loại', 'Vị trí', 'Phụ trách', 'Trạng thái'].map((h) => <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{assets.map((asset) => <tr key={asset.id} className="border-t border-neutral-100"><td className="px-3 py-2 font-mono">{asset.id}</td><td className="px-3 py-2 font-medium">{asset.name}</td><td className="px-3 py-2">{asset.category}</td><td className="px-3 py-2">{asset.location}</td><td className="px-3 py-2">{asset.owner}</td><td className="px-3 py-2">{asset.status}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="max-w-2xl mx-auto bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Quét tài sản</h2>
              <p className="text-xs text-neutral-500 mt-1">Dùng camera để quét liên tục các QR đã dán lên tài sản.</p>
            </div>
            {!isCameraActive ? (
              <button type="button" onClick={() => void startCamera()} className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer">
                <Camera className="w-3.5 h-3.5" /> Mở camera
              </button>
            ) : (
              <button type="button" onClick={stopCamera} className="h-9 px-3 rounded-lg border border-neutral-200 text-xs font-semibold cursor-pointer">Dừng camera</button>
            )}
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-neutral-900 aspect-video max-h-[420px]">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {!isCameraActive && <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 gap-2"><Camera className="w-8 h-8" /><span className="text-xs">Camera chưa bật</span></div>}
            {isCameraActive && <div className="absolute inset-[20%] border-2 border-white/80 rounded-xl pointer-events-none" />}
          </div>
          {cameraError && <p className="text-xs text-red-600">{cameraError}</p>}
          {scanMessage && <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800">{scanMessage}</div>}
          {lastAsset && (
            <div className="rounded-xl border border-neutral-200 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="min-w-0"><p className="text-xs text-neutral-500">Tài sản vừa quét</p><p className="text-sm font-semibold">{lastAsset.name}</p><p className="text-xs text-neutral-500 mt-0.5">{lastAsset.id} · {lastAsset.location || 'Chưa có vị trí'}</p></div>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-neutral-500">Đã quét: <strong className="text-neutral-900">{scanCount}</strong></span>
            <button type="button" onClick={() => setStep(4)} className="h-9 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer">Xem kết quả →</button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div><h2 className="text-sm font-semibold">Kết quả kiểm kê</h2><p className="text-xs text-neutral-500 mt-1">{assets.filter((a) => a.checkedAt).length}/{assets.length} tài sản đã quét.</p></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-neutral-200 text-xs font-semibold cursor-pointer"><Download className="w-3.5 h-3.5" /> Xuất CSV</button>
              <button type="button" onClick={() => { setLastAsset(null); setStep(3); }} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer"><Camera className="w-3.5 h-3.5" /> Quét tiếp</button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm mã, tên, vị trí..." className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-200 text-xs outline-none focus:border-neutral-400" /></div>
            <button type="button" onClick={() => { if (confirm('Xóa danh sách tài sản này?')) { setAssets([]); setStep(1); } }} className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-neutral-200 text-xs text-red-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> Xóa</button>
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-neutral-50 text-neutral-500"><tr>{['Mã', 'Tên tài sản', 'Vị trí', 'Phụ trách', 'Trạng thái', 'Kiểm kê'].map((h) => <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{filteredAssets.map((asset) => <tr key={asset.id} className="border-t border-neutral-100"><td className="px-3 py-2 font-mono">{asset.id}</td><td className="px-3 py-2 font-medium">{asset.name}</td><td className="px-3 py-2">{asset.location}</td><td className="px-3 py-2">{asset.owner}</td><td className="px-3 py-2">{asset.status}</td><td className="px-3 py-2">{asset.checkedAt ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Đã quét</span> : <span className="text-neutral-400">Chưa quét</span>}</td></tr>)}</tbody>
            </table>
          </div>
          <button type="button" onClick={() => setStep(3)} className="text-xs text-neutral-500 hover:text-neutral-900 cursor-pointer">← Quay lại quét tài sản</button>
        </section>
      )}

      {step > 1 && <button type="button" onClick={onBack} className="text-xs text-neutral-500 hover:text-neutral-900 cursor-pointer">← Về Workflows</button>}
    </div>
  );
};
