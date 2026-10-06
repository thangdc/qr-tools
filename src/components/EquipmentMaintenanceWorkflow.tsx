import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, Download, FileSpreadsheet, Printer, Upload, XCircle, AlertTriangle } from 'lucide-react';
import './EquipmentMaintenanceWorkflow.css';
import { useQRScanner } from '../hooks/useQRScanner';
import { BatchCardPrintModal, BatchPrintItem } from './BatchCardPrintModal';
import { ProModal } from './ProModal';
import { PREDEFINED_TEMPLATES } from '../utils/defaultTemplates';
import { DEFAULT_QR_OUTPUT_SETTINGS } from '../types/qr';
import { createExcelDataSource, createXlsxParser } from '../../packages/connectors/src/index.ts';
import { WorkflowImportService } from '../../packages/workflow-engine/src/index.ts';
import { DefaultScanRuntime } from '../../packages/workflow-engine/src/scan.ts';
import type { WorkflowPersistence } from '../../packages/workflow-engine/src/persistence.ts';
import { equipmentMaintenanceWorkflow } from '../../packages/workflows/equipment-maintenance/src/index.ts';
import { importEquipmentMaintenance } from '../../packages/workflows/equipment-maintenance/src/import.ts';
import { qrPayloadDecoder, qrPayloadEncoder } from '../../packages/qr-engine/src/index.ts';
import type { WorkflowRecord } from '../../packages/types/src/index.ts';

interface Props { onBack: () => void; commercialMode?: 'standalone' | 'embedded'; }
type Step = 'data' | 'print' | 'scan' | 'result';
const SESSION_KEY = 'qr_tools_equipment_maintenance_records';

function readRecords(): WorkflowRecord[] {
  try { const raw = sessionStorage.getItem(SESSION_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
function writeRecords(records: WorkflowRecord[]) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(records)); }
function recordKey(r: WorkflowRecord) { return `${r.workflowId}:${r.workflowVersion}:${r.recordId}`; }
class SessionRepository {
  private records: Map<string, WorkflowRecord>;
  constructor(initial: WorkflowRecord[]) { this.records = new Map(initial.map(r => [recordKey(r), r])); }
  async get(workflowId: string, workflowVersion: number, recordId: string) { return this.records.get(`${workflowId}:${workflowVersion}:${recordId}`) ?? null; }
  async save(record: WorkflowRecord) { this.records.set(recordKey(record), record); writeRecords([...this.records.values()]); }
  async delete(workflowId: string, workflowVersion: number, recordId: string) { this.records.delete(`${workflowId}:${workflowVersion}:${recordId}`); writeRecords([...this.records.values()]); }
}
const definitions = { async get() { return equipmentMaintenanceWorkflow; }, async save() {} };
const dataOf = (r: WorkflowRecord) => r.data as Record<string, unknown>;

export const EquipmentMaintenanceWorkflow: React.FC<Props> = ({ onBack, commercialMode = 'standalone' }) => {
  const [step, setStep] = useState<Step>('data');
  const [records, setRecords] = useState<WorkflowRecord[]>(() => readRecords());
  const [selectedRecord, setSelectedRecord] = useState<WorkflowRecord | null>(null);
  const [maintenanceDate, setMaintenanceDate] = useState('');
  const [maintenanceBy, setMaintenanceBy] = useState('');
  const [maintenanceNote, setMaintenanceNote] = useState('');
  const [lastScan, setLastScan] = useState<'success' | 'duplicate' | 'unknown' | null>(null);
  const [scannedIds, setScannedIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [isPro, setIsPro] = useState(() => localStorage.getItem('qr_tools_pro') === 'true');
  const [activeTemplateId, setActiveTemplateId] = useState(PREDEFINED_TEMPLATES[0]?.id || '');

  const persistence = useMemo<WorkflowPersistence>(() => ({ records: new SessionRepository(readRecords()), definitions }), []);
  const completed = useMemo(() => records.filter(r => Boolean(dataOf(r).maintenanceDate)).length, [records]);

  const { videoRef, isCameraActive: cameraActive, cameraError, startCamera, stopCamera, scanFile } = useQRScanner({
    onDecoded: payload => { if (!payload.startsWith('qrtools:')) { setError('Đây không phải mã QR của workflow Bảo trì thiết bị.'); setLastScan('unknown'); return; } void handleScan(payload); },
    stopAfterDecode: false,
  });
  useEffect(() => () => stopCamera(), [stopCamera]);

  const resolveRecord = async (payload: string) => {
    const runtime = new DefaultScanRuntime(qrPayloadDecoder, { async verify() { return true; } }, { async resolve(workflowId, workflowVersion, recordId) { return persistence.records.get(workflowId, workflowVersion, recordId); } }, { async get() { return equipmentMaintenanceWorkflow; } });
    return (await runtime.scan(payload)).record;
  };

  const handleScan = async (payload: string) => {
    try {
      setError(''); const record = await resolveRecord(payload);
      if (!record) { setSelectedRecord(null); setLastScan('unknown'); return; }
      const d = dataOf(record); const duplicate = Boolean(d.maintenanceDate);
      setSelectedRecord(record); setMaintenanceDate(typeof d.maintenanceDate === 'string' ? String(d.maintenanceDate) : ''); setMaintenanceBy(typeof d.maintenanceBy === 'string' ? String(d.maintenanceBy) : ''); setMaintenanceNote(typeof d.maintenanceNote === 'string' ? String(d.maintenanceNote) : ''); setLastScan(duplicate ? 'duplicate' : 'success'); setScannedIds(prev => [record.recordId, ...prev.filter(id => id !== record.recordId)].slice(0, 8));
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể đọc mã QR.'); setLastScan('unknown'); }
  };

  const importData = async (file?: File) => {
    if (!file) return; setLoading(true); setError('');
    try {
      const source = createExcelDataSource(new Uint8Array(await file.arrayBuffer()), createXlsxParser());
      const service = new WorkflowImportService({ persistence, qrEncoder: qrPayloadEncoder });
      const result = await importEquipmentMaintenance(source, service); writeRecords(result.records); setRecords(result.records); setStep('print');
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể import file Excel.'); } finally { setLoading(false); }
  };

  const printItems: BatchPrintItem[] = records.map(r => { const d = dataOf(r); return { id: r.recordId, label: String(d.assetName ?? r.recordId), payload: qrPayloadEncoder.encode({ version: r.workflowVersion, workflowId: r.workflowId, recordId: r.recordId }), type: 'text', subtitle: [r.recordId, d.location].filter(Boolean).join(' · ') }; });
  const handlePrint = () => { if (!records.length) return; if (commercialMode === 'standalone' && !isPro) { setProOpen(true); return; } setPrintOpen(true); };

  const saveMaintenance = async () => {
    if (!selectedRecord) return;
    if (!maintenanceDate || !maintenanceBy.trim()) { setError('Vui lòng nhập ngày bảo trì và người thực hiện.'); return; }
    const updated: WorkflowRecord = { ...selectedRecord, data: { ...selectedRecord.data, maintenanceDate, maintenanceBy: maintenanceBy.trim(), maintenanceNote: maintenanceNote.trim() } };
    await persistence.records.save(updated); setRecords(readRecords()); setSelectedRecord(updated); setLastScan('success'); setError('');
  };
  const handleImageUpload = async (file?: File) => { if (!file) return; const payload = await scanFile(file); if (!payload) { setError('Không tìm thấy mã QR trong ảnh.'); setLastScan('unknown'); return; } await handleScan(payload); };
  const exportCsv = () => { const rows = [['Asset ID','Asset Name','Location','Maintenance Date','Maintenance By','Maintenance Note'], ...records.map(r => { const d = dataOf(r); return [r.recordId,d.assetName ?? '',d.location ?? '',d.maintenanceDate ?? '',d.maintenanceBy ?? '',d.maintenanceNote ?? '']; })]; const csv = rows.map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n'); const url = URL.createObjectURL(new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'})); const a=document.createElement('a'); a.href=url; a.download=`equipment-maintenance-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url); };
  const reset = () => { stopCamera(); setStep('data'); setRecords([]); writeRecords([]); setSelectedRecord(null); setLastScan(null); setScannedIds([]); setError(''); };
  const go = (target: Step) => { if (target !== 'data' && !records.length) return; if (target !== 'scan') stopCamera(); setStep(target); };
  const steps: Step[] = ['data','print','scan','result']; const labels = ['Nhập danh sách','Tạo & in QR','Bảo trì','Kết quả'];

  return <>
    <div className={`qrw-workflow w-full max-w-5xl mx-auto space-y-6 ${commercialMode === 'embedded' ? 'qrw-workflow--embedded' : ''}`}>
      <div className="pb-5 border-b border-neutral-200">{commercialMode === 'standalone' && <button type="button" onClick={() => { stopCamera(); onBack(); }} className="qrw-button qrw-button--link inline-flex items-center gap-1.5 text-xs font-medium mb-3 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Quay lại Workflows</button>}<h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">🔧 Bảo trì thiết bị</h1><p className="text-xs sm:text-sm text-neutral-500 mt-1">Danh sách → tạo & in QR → quét → ghi nhận bảo trì → kết quả.</p></div>
      <div className="qrw-step-tabs grid grid-cols-4 gap-1.5 text-[11px] sm:text-xs">{steps.map((s,i)=><button type="button" key={s} onClick={()=>go(s)} className={`qrw-step-tab rounded-lg px-2 py-2 text-center font-medium cursor-pointer ${step===s?'qrw-step-tab--active bg-neutral-900 text-white':'qrw-step-tab--inactive bg-neutral-100 text-neutral-500'}`}>{i+1}. {labels[i]}</button>)}</div>

      {step==='data' && <div className="qr-tools-step1-layout"><div className="qrw-card bg-white border border-neutral-200 rounded-2xl p-5 space-y-4"><h2 className="text-sm font-semibold">1. Nhập danh sách thiết bị</h2><label className={`flex flex-col items-center justify-center gap-2 min-h-44 rounded-xl border-2 border-dashed border-neutral-300 hover:border-neutral-500 cursor-pointer ${loading?'opacity-50 pointer-events-none':''}`}><FileSpreadsheet className="w-7 h-7 text-neutral-400"/><span className="text-xs font-semibold">{loading?'Đang import...':'Chọn file Excel (.xlsx)'}</span><span className="text-[11px] text-neutral-400">Asset ID · Asset Name · Location</span><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" disabled={loading} onChange={e=>{void importData(e.target.files?.[0]);e.currentTarget.value='';}}/></label><div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 text-xs leading-5"><strong>Bắt buộc:</strong> Asset ID, Asset Name, Location<br/><strong>Tùy chọn:</strong> Maintenance Date, Maintenance Note</div>{error&&<p className="text-xs text-red-600">{error}</p>}</div><aside className="qrw-process qr-tools-process-card"><h2 className="qr-tools-process-title">Quy trình</h2><ol className="qr-tools-process-list"><li><span className="qr-tools-process-number">1</span><span>Import danh sách thiết bị</span></li><li><span className="qr-tools-process-number">2</span><span>Tạo & in QR</span></li><li><span className="qr-tools-process-number">3</span><span>Quét QR khi cần bảo trì</span></li><li><span className="qr-tools-process-number">4</span><span>Nhập thông tin và lưu kết quả</span></li></ol></aside></div>}

      {step==='print' && <div className="qrw-step-panel w-full bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 space-y-5"><div><p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Bước 2</p><h2 className="text-lg font-bold text-neutral-900 mt-1">Tạo & in QR cho thiết bị</h2><p className="text-sm text-neutral-500 mt-1">Đã có <strong className="text-neutral-900">{records.length} thiết bị</strong>.</p></div><div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-xs text-neutral-600 space-y-1.5"><p>• In QR và dán lên thiết bị.</p><p>• Nếu đã có QR, có thể bỏ qua bước này.</p></div><div className="overflow-x-auto border border-neutral-200 rounded-xl"><table className="w-full text-xs"><thead className="bg-neutral-50 text-neutral-500"><tr><th className="text-left px-3 py-2 font-medium">Mã</th><th className="text-left px-3 py-2 font-medium">Thiết bị</th><th className="text-left px-3 py-2 font-medium">Vị trí</th></tr></thead><tbody>{records.map(r=>{const d=dataOf(r);return <tr key={r.recordId} className="border-t border-neutral-100"><td className="px-3 py-2 font-mono">{r.recordId}</td><td className="px-3 py-2 font-medium">{String(d.assetName??'')}</td><td className="px-3 py-2">{String(d.location??'')}</td></tr>})}</tbody></table></div><div className="flex flex-wrap justify-center sm:justify-end gap-2"><button type="button" onClick={handlePrint} className="qrw-button--primary qrw-button h-10 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><Printer className="w-3.5 h-3.5"/>Tạo & in QR</button><button type="button" onClick={()=>go('scan')} className="qrw-button qrw-button--secondary h-10 px-4 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">Tôi đã có QR <ArrowRight className="w-3.5 h-3.5"/></button></div><div className="flex items-center justify-between gap-2"><button type="button" onClick={()=>go('data')} className="qrw-button qrw-button--secondary h-9 px-3 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5"/>Quay lại danh sách</button><button type="button" onClick={()=>go('scan')} className="qrw-button qrw-button--primary h-9 px-3 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">Tiếp tục bảo trì <ArrowRight className="w-3.5 h-3.5"/></button></div></div>}

      {step==='scan' && <div className="space-y-4"><div className="grid lg:grid-cols-[1.2fr_.8fr] gap-5"><div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4"><div className="relative aspect-video bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center">{cameraActive?<video ref={videoRef} playsInline muted className="w-full h-full object-cover"/>:<div className="text-center text-neutral-400"><Camera className="w-10 h-10 mx-auto mb-2"/><p className="text-xs">Bấm bắt đầu để quét</p></div>}{cameraActive&&<div className="absolute inset-[12%] border-2 border-white/80 rounded-2xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]"/>}</div>{cameraError&&<div className="text-xs text-red-600">{cameraError}</div>}{error&&<div className="text-xs text-red-600">{error}</div>}<div className="flex gap-2"><button type="button" onClick={cameraActive?stopCamera:startCamera} className={`qrw-button--danger qrw-button flex-1 h-9 rounded-lg text-xs font-semibold cursor-pointer ${cameraActive?'bg-red-600 text-white':'bg-neutral-900 text-white'}`}><Camera className="inline w-3.5 h-3.5 mr-1"/>{cameraActive?'Dừng camera':'Bắt đầu quét'}</button><label className="qrw-button qrw-button--muted flex-1 h-9 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"><Upload className="w-3.5 h-3.5"/>Quét bằng ảnh<input type="file" accept="image/*" className="hidden" onChange={e=>void handleImageUpload(e.target.files?.[0])}/></label></div></div><div className="space-y-4"><div className="bg-white border border-neutral-200 rounded-2xl p-5">{!lastScan?<div className="py-8 text-center text-neutral-400 text-xs">Đang chờ quét...</div>:lastScan==='success'?<div className="text-center py-5"><CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600"/><p className="mt-2 text-xs font-semibold text-emerald-700">ĐÃ LƯU BẢO TRÌ</p></div>:lastScan==='duplicate'?<div className="text-center py-5"><AlertTriangle className="w-10 h-10 mx-auto text-amber-600"/><p className="mt-2 text-xs font-semibold text-amber-700">THIẾT BỊ ĐÃ CÓ LẦN BẢO TRÌ</p></div>:<div className="text-center py-5"><XCircle className="w-10 h-10 mx-auto text-red-600"/><p className="mt-2 text-xs font-semibold text-red-700">KHÔNG TÌM THẤY</p><p className="text-xs text-neutral-500 mt-2">QR này không thuộc danh sách thiết bị.</p></div>}</div>{selectedRecord&&<div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4"><div><p className="text-xs font-mono text-neutral-500">{selectedRecord.recordId}</p><h2 className="text-lg font-bold text-neutral-900">{String(dataOf(selectedRecord).assetName??'')}</h2><p className="text-xs text-neutral-500">{String(dataOf(selectedRecord).location??'')}</p></div><div className="border-t border-neutral-100 pt-4 space-y-3"><h3 className="text-sm font-semibold">Ghi nhận bảo trì</h3><label className="block"><span className="text-xs font-medium text-neutral-600">Ngày bảo trì</span><input type="date" value={maintenanceDate} onChange={e=>setMaintenanceDate(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-lg border border-neutral-200 text-sm"/></label><label className="block"><span className="text-xs font-medium text-neutral-600">Người thực hiện</span><input value={maintenanceBy} onChange={e=>setMaintenanceBy(e.target.value)} placeholder="Tên kỹ thuật viên" className="mt-1 w-full h-9 px-3 rounded-lg border border-neutral-200 text-sm"/></label><label className="block"><span className="text-xs font-medium text-neutral-600">Ghi chú</span><textarea value={maintenanceNote} onChange={e=>setMaintenanceNote(e.target.value)} rows={3} placeholder="Tình trạng, nội dung sửa chữa..." className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm resize-none"/></label><button type="button" onClick={()=>void saveMaintenance()} className="qrw-button qrw-button--primary w-full h-9 text-xs font-semibold cursor-pointer">Lưu lần bảo trì</button></div></div>}<div className="bg-white border border-neutral-200 rounded-2xl p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Tiến độ</h2><span className="text-xs text-neutral-500">{completed}/{records.length}</span></div><div className="h-2 rounded-full bg-neutral-100 mt-3 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{width:`${records.length?completed/records.length*100:0}%`}}/></div><div className="mt-4 space-y-2 max-h-32 overflow-auto">{scannedIds.map(id=><div key={id} className="text-xs font-mono">{id}</div>)}{!scannedIds.length&&<p className="text-xs text-neutral-400">Chưa có thiết bị nào được quét.</p>}</div></div></div></div><div className="flex items-center justify-between gap-2"><button type="button" onClick={()=>{stopCamera();go('print')}} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5"/>Quay lại tạo & in QR</button><button type="button" onClick={()=>{stopCamera();go('result')}} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">Kết quả <ArrowRight className="w-3.5 h-3.5"/></button></div></div>}

      {step==='result' && <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Kết quả bảo trì</h2><p className="text-xs text-neutral-500 mt-1">{completed}/{records.length} thiết bị đã có ghi nhận.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={exportCsv} className="qrw-button--secondary qrw-button h-9 px-3 rounded-lg border border-neutral-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><Download className="w-3.5 h-3.5"/>Xuất CSV</button><button type="button" onClick={()=>go('scan')} className="qrw-button qrw-button--primary h-9 px-3 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">Bảo trì tiếp <ArrowRight className="w-3.5 h-3.5"/></button></div></div><div className="bg-white border border-neutral-200 rounded-2xl overflow-x-auto"><table className="w-full text-xs"><thead className="bg-neutral-50 text-neutral-500"><tr><th className="text-left px-3 py-2 font-medium">Mã</th><th className="text-left px-3 py-2 font-medium">Thiết bị</th><th className="text-left px-3 py-2 font-medium">Vị trí</th><th className="text-left px-3 py-2 font-medium">Ngày</th><th className="text-left px-3 py-2 font-medium">Người thực hiện</th><th className="text-left px-3 py-2 font-medium">Ghi chú</th></tr></thead><tbody>{records.map(r=>{const d=dataOf(r);return <tr key={r.recordId} className="border-t border-neutral-100"><td className="px-3 py-2 font-mono">{r.recordId}</td><td className="px-3 py-2 font-medium">{String(d.assetName??'')}</td><td className="px-3 py-2">{String(d.location??'')}</td><td className="px-3 py-2">{d.maintenanceDate?String(d.maintenanceDate):'—'}</td><td className="px-3 py-2">{d.maintenanceBy?String(d.maintenanceBy):'—'}</td><td className="px-3 py-2 text-neutral-500">{d.maintenanceNote?String(d.maintenanceNote):'—'}</td></tr>})}</tbody></table></div><div className="flex items-center justify-between gap-2"><button type="button" onClick={()=>go('scan')} className="h-9 px-3 rounded-lg bg-neutral-100 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5"/>Quay lại bảo trì</button><button type="button" onClick={reset} className="qrw-button qrw-button--link text-xs cursor-pointer">Bắt đầu workflow mới</button></div></div>}
    </div>
    {typeof document !== 'undefined' && createPortal(<BatchCardPrintModal isOpen={printOpen} onClose={()=>setPrintOpen(false)} items={printItems} templates={PREDEFINED_TEMPLATES} activeTemplateId={activeTemplateId} onSelectTemplate={setActiveTemplateId} outputSettings={DEFAULT_QR_OUTPUT_SETTINGS} embedded={commercialMode === 'embedded'} />, document.body)}
    {commercialMode === 'standalone' && typeof document !== 'undefined' && createPortal(<ProModal isOpen={proOpen} onClose={()=>setProOpen(false)} isPro={isPro} onTogglePro={value=>{setIsPro(value); localStorage.setItem('qr_tools_pro', value ? 'true' : 'false');}} />, document.body)}
  </>;
};