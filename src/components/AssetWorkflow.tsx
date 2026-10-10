import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, Download, Printer, Search, XCircle } from 'lucide-react';
import { useQRScanner } from '../hooks/useQRScanner';
import { BatchPrintItem } from './BatchCardPrintModal';
import { trackEvent } from '../utils/analytics';

interface Asset { id: string; name: string; category: string; location: string; owner: string; status: string; note: string; checkedAt?: number; }
interface AssetWorkflowProps { isPro: boolean; onOpenPro: (source?: string) => void; onBack: () => void; onGenerateAndPrint: (items: BatchPrintItem[]) => void; }

const SAMPLE = 'Mã tài sản\tTên tài sản\tLoại\tVị trí\tNgười phụ trách\tTrạng thái\tGhi chú\nTS001\tLaptop Dell\tThiết bị IT\tPhòng IT\tNguyễn Văn A\tĐang sử dụng\tDell Latitude\nTS002\tMáy chiếu Epson\tThiết bị\tPhòng họp\tTrần Văn B\tĐang sử dụng\t\nTS003\tBàn làm việc\tNội thất\tPhòng 201\t\tĐang sử dụng\t';

function parseAssets(value: string): Asset[] {
  const rows = value.trim().split(/\r?\n/).map(line => line.split('\t').map(v => v.trim())).filter(row => row[0] && row[1]);
  if (rows.length && rows[0][0].toLowerCase() === 'mã tài sản') rows.shift();
  return rows.map(row => ({ id: row[0], name: row[1], category: row[2] || '', location: row[3] || '', owner: row[4] || '', status: row[5] || 'Đang sử dụng', note: row[6] || '' }));
}

function encodeAsset(asset: Asset) { return JSON.stringify({ v: 1, type: 'asset', id: asset.id, name: asset.name, category: asset.category, location: asset.location, owner: asset.owner, status: asset.status, note: asset.note }); }
function decodeAsset(raw: string): Asset | null { try { const data = JSON.parse(raw); if (data?.type !== 'asset' || !data.id || !data.name) return null; return { id: String(data.id), name: String(data.name), category: String(data.category || ''), location: String(data.location || ''), owner: String(data.owner || ''), status: String(data.status || 'Đang sử dụng'), note: String(data.note || '') }; } catch { return null; } }

function playScanBeep(status: 'success' | 'duplicate' | 'unknown') {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); const now = ctx.currentTime;
    const tones = status === 'success' ? [{ f: 880, s: 0, d: .09 }] : status === 'duplicate' ? [{ f: 520, s: 0, d: .08 }, { f: 520, s: .11, d: .08 }] : [{ f: 260, s: 0, d: .16 }];
    osc.type = 'sine'; osc.connect(gain); gain.connect(ctx.destination); gain.gain.setValueAtTime(.0001, now);
    tones.forEach(t => { osc.frequency.setValueAtTime(t.f, now + t.s); gain.gain.setValueAtTime(.12, now + t.s); gain.gain.exponentialRampToValueAtTime(.0001, now + t.s + t.d); });
    osc.start(now); osc.stop(now + tones[tones.length - 1].s + tones[tones.length - 1].d + .02); osc.addEventListener('ended', () => void ctx.close());
  } catch { /* optional audio */ }
}

export const AssetWorkflow: React.FC<AssetWorkflowProps> = ({ isPro, onOpenPro, onBack, onGenerateAndPrint }) => {
  const [step, setStep] = useState<'data' | 'print' | 'scan' | 'result'>('data');
  const [input, setInput] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [query, setQuery] = useState('');
  const [lastResult, setLastResult] = useState<{ asset?: Asset; status: 'success' | 'duplicate' | 'unknown' } | null>(null);
  const [error, setError] = useState('');

  const checked = useMemo(() => assets.filter(a => a.checkedAt).length, [assets]);
  const recentScans = useMemo(() => assets.filter(a => a.checkedAt).sort((a,b) => (b.checkedAt || 0) - (a.checkedAt || 0)).slice(0, 8), [assets]);

  const handleScan = (raw: string) => {
    if (!isPro) { stopCamera(); onOpenPro('workflow_asset_scan'); return; }
    const asset = decodeAsset(raw);
    if (!asset) { setLastResult({ status: 'unknown' }); playScanBeep('unknown'); trackEvent('workflow_asset_scanned', { status: 'unknown' }); return; }
    const existing = assets.find(a => a.id === asset.id);
    if (!existing) { setLastResult({ status: 'unknown' }); playScanBeep('unknown'); trackEvent('workflow_asset_scanned', { status: 'unknown' }); return; }
    if (existing.checkedAt) { setLastResult({ asset: existing, status: 'duplicate' }); playScanBeep('duplicate'); return; }
    const at = Date.now();
    setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, checkedAt: at } : a));
    setLastResult({ asset: { ...existing, checkedAt: at }, status: 'success' }); playScanBeep('success'); trackEvent('workflow_asset_scanned', { asset_id: asset.id, status: 'success' });
  };

  const { videoRef, isCameraActive: cameraActive, cameraError, startCamera, stopCamera } = useQRScanner({ onDecoded: handleScan, stopAfterDecode: false });
  const goToScan = () => { if (!isPro) { onOpenPro('workflow_asset_scan'); return; } setStep('scan'); };
  const handleStartScan = () => { if (!isPro) { onOpenPro('workflow_asset_scan'); return; } void startCamera(); };
  useEffect(() => () => stopCamera(), [stopCamera]);

  const importAssets = () => { const parsed = parseAssets(input); if (!parsed.length) { setError('Cần có ít nhất một tài sản với Mã tài sản và Tên tài sản.'); return; } setError(''); setAssets(parsed); setStep('print'); trackEvent('workflow_asset_list_imported', { count: parsed.length }); };
  const buildPrintItems = () => assets.map(a => ({ id: a.id, label: a.name, payload: encodeAsset(a), type: 'text' as const, subtitle: [a.id, a.location].filter(Boolean).join(' · ') }));
  const handlePrint = () => { if (!isPro) { onOpenPro('workflow_asset_print'); return; } onGenerateAndPrint(buildPrintItems()); trackEvent('workflow_asset_qr_print_opened', { count: assets.length }); };
  const exportCsv = () => { const header = ['Mã tài sản','Tên tài sản','Loại','Vị trí','Người phụ trách','Trạng thái','Ghi chú','Lần quét gần nhất']; const rows = assets.map(a => [a.id,a.name,a.category,a.location,a.owner,a.status,a.note,a.checkedAt ? new Date(a.checkedAt).toLocaleString('vi-VN') : '']); const csv = [header,...rows].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n'); const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`tai-san-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url); trackEvent('workflow_asset_exported',{count:assets.length}); };
  const filtered = useMemo(() => { const q=query.trim().toLowerCase(); return q ? assets.filter(a => [a.id,a.name,a.category,a.location,a.owner,a.status].some(v=>v.toLowerCase().includes(q))) : assets; }, [assets,query]);
  const reset = () => { stopCamera(); setStep('data'); setInput(''); setAssets([]); setQuery(''); setLastResult(null); setError(''); };

  const steps = ['data','print','scan','result'] as const;
  const labels = ['Nhập danh sách','Tạo & in QR','Quét tài sản','Kết quả'];

  return <div className="w-full max-w-5xl mx-auto space-y-6">
    <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-200">
      <div><button type="button" onClick={() => { stopCamera(); onBack(); }} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 mb-2 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Quay lại Workflows</button><h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">📦 Quản lý tài sản</h1><p className="text-xs sm:text-sm text-neutral-500 mt-1">Tạo QR cho từng tài sản → dán nhãn → quét để kiểm kê.</p></div>
      {step !== 'data' && <div className="text-right"><div className="text-xl font-bold text-neutral-900">{checked}/{assets.length}</div><div className="text-[11px] text-neutral-500">đã quét</div></div>}
    </div>

    <div className="grid grid-cols-4 gap-1.5 text-[11px] sm:text-xs">{steps.map((s,i)=><button type="button" key={s} onClick={()=>{ if(i===0)setStep('data'); else if(i===1&&assets.length)setStep('print'); else if(i===2&&assets.length)goToScan(); else if(i===3&&assets.length)setStep('result'); }} className={`rounded-lg px-2 py-2 text-center font-medium cursor-pointer ${step===s?'bg-neutral-900 text-white':'bg-neutral-100 text-neutral-500'}`}>{i+1}. {labels[i]}</button>)}</div>

    {step==='data' && <div className="grid md:grid-cols-[1fr_280px] gap-5"><div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4"><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">1. Nhập danh sách</h2><button type="button" onClick={()=>setInput(SAMPLE)} className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">Dùng dữ liệu mẫu</button></div><textarea value={input} onChange={e=>setInput(e.target.value)} placeholder={SAMPLE} rows={9} className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs font-mono outline-none focus:border-neutral-900"/><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-[11px] text-neutral-500">Bắt buộc: Mã tài sản, Tên tài sản.</span><button type="button" onClick={importAssets} disabled={!input.trim()} className="h-9 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer">Tiếp tục <ArrowRight className="w-3.5 h-3.5"/></button></div>{error&&<p className="text-xs text-red-600">{error}</p>}</div><aside className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 space-y-3"><h2 className="text-sm font-semibold">Bạn có sẵn Excel?</h2><p className="text-xs text-neutral-500 leading-5">Mở Excel, chọn vùng dữ liệu rồi copy/paste vào đây.</p><div className="text-xs font-mono bg-white border border-neutral-200 rounded-lg p-3 overflow-auto">{SAMPLE}</div></aside></div>}

    {step==='print' && <div className="max-w-2xl mx-auto bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 space-y-5"><div><p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Bước 2</p><h2 className="text-lg font-bold text-neutral-900 mt-1">Tạo & in QR cho tài sản</h2><p className="text-sm text-neutral-500 mt-1">Đã có <strong className="text-neutral-900">{assets.length} tài sản</strong>.</p></div><div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-xs text-neutral-600 space-y-1.5"><p>• In mã QR và dán lên từng tài sản.</p><p>• Nếu đã có QR, bạn có thể bỏ qua bước này.</p></div><div className="overflow-x-auto border border-neutral-200 rounded-xl"><table className="w-full text-xs"><thead className="bg-neutral-50 text-neutral-500"><tr>{['Mã','Tên tài sản','Vị trí','Trạng thái'].map(h=><th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{assets.map(a=><tr key={a.id} className="border-t border-neutral-100"><td className="px-3 py-2 font-mono">{a.id}</td><td className="px-3 py-2 font-medium">{a.name}</td><td className="px-3 py-2">{a.location}</td><td className="px-3 py-2">{a.status}</td></tr>)}</tbody></table></div><div className="flex flex-wrap justify-center sm:justify-end gap-2"><button type="button" onClick={handlePrint} className="h-10 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><Printer className="w-3.5 h-3.5"/>Tạo & in QR {!isPro && <span className="ml-1 rounded bg-white/15 px-1 py-0.5 text-[9px] font-bold">PRO</span>}</button><button type="button" onClick={goToScan} className="h-10 px-4 rounded-lg bg-white border border-neutral-300 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">Tôi đã có QR <ArrowRight className="w-3.5 h-3.5"/></button></div><div className="flex items-center justify-between gap-2"><button type="button" onClick={()=>setStep('data')} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5"/>Quay lại danh sách</button><button type="button" onClick={()=>setStep('scan')} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">Tiếp tục kiểm kê <ArrowRight className="w-3.5 h-3.5"/></button></div></div>}

    {step==='scan' && <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={()=>{stopCamera();setStep('print')}} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5"/>Quay lại tạo & in QR</button>
        <button type="button" onClick={()=>{stopCamera();setStep('result')}} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">Kết quả <ArrowRight className="w-3.5 h-3.5"/></button>
      </div>
      <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-5">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
          <div className="relative aspect-video bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center">
            {cameraActive ? <video ref={videoRef} playsInline muted className="w-full h-full object-cover" /> : <div className="text-center text-neutral-400"><Camera className="w-10 h-10 mx-auto mb-2" /><p className="text-xs">Bấm bắt đầu để quét</p></div>}
            {cameraActive && <div className="absolute inset-[12%] border-2 border-white/80 rounded-2xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]"><span className="absolute -top-0.5 -left-0.5 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg" /><span className="absolute -top-0.5 -right-0.5 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg" /><span className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg" /><span className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg" /><div className="absolute left-1/2 top-1/2 w-[70%] h-0.5 -translate-x-1/2 -translate-y-1/2 bg-white/70" /></div>}
          </div>
          {cameraError && <div className="text-xs text-red-600">{cameraError}</div>}
          <button type="button" onClick={cameraActive ? stopCamera : handleStartScan} className={`w-full h-9 rounded-lg text-xs font-semibold cursor-pointer ${cameraActive ? 'bg-red-600 text-white' : 'bg-neutral-900 text-white'}`}>{cameraActive ? 'Dừng camera' : <>Bắt đầu quét {!isPro && <span className="ml-1 rounded bg-white/15 px-1 py-0.5 text-[9px] font-bold">PRO</span>}</>}</button>
        </div>
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            {!lastResult ? <div className="py-8 text-center text-neutral-400 text-xs">Đang chờ quét...</div> : lastResult.status === 'success' ? (
              <div className="text-center py-5"><CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" /><p className="mt-2 text-xs font-semibold text-emerald-700">QUÉT THÀNH CÔNG</p><p className="text-lg font-bold text-neutral-900 mt-1">{lastResult.asset?.name}</p><p className="text-xs text-neutral-500">{lastResult.asset?.id}</p><p className="text-[11px] text-neutral-400 mt-2">{lastResult.asset?.location || 'Chưa có vị trí'}</p></div>
            ) : lastResult.status === 'duplicate' ? (
              <div className="text-center py-5"><XCircle className="w-10 h-10 mx-auto text-amber-600" /><p className="mt-2 text-xs font-semibold text-amber-700">ĐÃ KIỂM KÊ</p><p className="text-lg font-bold text-neutral-900 mt-1">{lastResult.asset?.name}</p><p className="text-xs text-neutral-500">{lastResult.asset?.id}</p></div>
            ) : (
              <div className="text-center py-5"><XCircle className="w-10 h-10 mx-auto text-red-600" /><p className="mt-2 text-xs font-semibold text-red-700">KHÔNG TÌM THẤY</p><p className="text-xs text-neutral-500 mt-2">QR này không thuộc danh sách tài sản.</p></div>
            )}
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Tiến độ</h2><span className="text-xs text-neutral-500">{checked}/{assets.length}</span></div>
            <div className="h-2 rounded-full bg-neutral-100 mt-3 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${assets.length ? checked / assets.length * 100 : 0}%` }} /></div>
            <button type="button" onClick={()=>{stopCamera();setStep('result')}} className="w-full mt-4 h-9 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer">Xem kết quả</button>
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold">Quét gần đây</h2>
            <div className="mt-3 space-y-2 max-h-44 overflow-auto">{recentScans.length ? recentScans.map(item => <div key={item.id} className="flex items-center justify-between text-xs"><span><span className="font-mono">{item.id}</span> · {item.name}</span><span className="text-emerald-600">✓ {item.checkedAt ? new Date(item.checkedAt).toLocaleTimeString('vi-VN') : ''}</span></div>) : <p className="text-xs text-neutral-400 py-4 text-center">Chưa có tài sản nào được quét.</p>}</div>
          </div>
        </div>
      </div>
    </div>}

    {step==='result' && <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Kết quả kiểm kê</h2><p className="text-xs text-neutral-500 mt-1">{checked}/{assets.length} tài sản đã quét.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={exportCsv} className="h-9 px-3 rounded-lg border border-neutral-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><Download className="w-3.5 h-3.5"/>Xuất CSV</button><button type="button" onClick={()=>setStep('scan')} className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><Camera className="w-3.5 h-3.5"/>Quét tiếp</button></div></div><div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm mã, tên, vị trí..." className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-200 text-xs outline-none focus:border-neutral-400"/></div></div><div className="bg-white border border-neutral-200 rounded-2xl overflow-x-auto"><table className="w-full text-xs"><thead className="bg-neutral-50 text-neutral-500"><tr>{['Mã','Tên tài sản','Vị trí','Phụ trách','Trạng thái','Kiểm kê'].map(h=><th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{filtered.map(a=><tr key={a.id} className="border-t border-neutral-100"><td className="px-3 py-2 font-mono">{a.id}</td><td className="px-3 py-2 font-medium">{a.name}</td><td className="px-3 py-2">{a.location}</td><td className="px-3 py-2">{a.owner}</td><td className="px-3 py-2">{a.status}</td><td className="px-3 py-2">{a.checkedAt?<span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5"/>Đã quét</span>:<span className="text-neutral-400">Chưa quét</span>}</td></tr>)}</tbody></table></div><div className="flex items-center justify-between gap-2"><button type="button" onClick={()=>setStep('scan')} className="text-xs text-neutral-500 hover:text-neutral-900 cursor-pointer">← Quay lại quét tài sản</button><button type="button" onClick={reset} className="text-xs text-neutral-500 hover:text-neutral-900 cursor-pointer">Bắt đầu workflow mới</button></div></div>}
  </div>;
};