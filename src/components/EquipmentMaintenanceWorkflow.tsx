import React, { useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Printer,
  QrCode,
  ScanLine,
  Upload,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useQRScanner } from '../hooks/useQRScanner';
import { createExcelDataSource, createXlsxParser } from '../../packages/connectors/src/index.ts';
import { WorkflowImportService } from '../../packages/workflow-engine/src/index.ts';
import { DefaultScanRuntime } from '../../packages/workflow-engine/src/scan.ts';
import type { WorkflowPersistence } from '../../packages/workflow-engine/src/persistence.ts';
import { equipmentMaintenanceWorkflow } from '../../packages/workflows/equipment-maintenance/src/index.ts';
import { importEquipmentMaintenance } from '../../packages/workflows/equipment-maintenance/src/import.ts';
import { qrPayloadDecoder, qrPayloadEncoder } from '../../packages/qr-engine/src/index.ts';
import type { WorkflowRecord } from '../../packages/types/src/index.ts';

interface Props {
  onBack: () => void;
}

type Step = 'data' | 'print' | 'scan' | 'result';

const SESSION_KEY = 'qr_tools_equipment_maintenance_records';

function readSessionRecords(): WorkflowRecord[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSessionRecords(records: WorkflowRecord[]) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(records));
}

function recordKey(record: WorkflowRecord) {
  return record.workflowId + ':' + record.workflowVersion + ':' + record.recordId;
}

class MemoryRecordRepository {
  private records: Map<string, WorkflowRecord>;

  constructor(initialRecords: WorkflowRecord[]) {
    this.records = new Map(initialRecords.map((record) => [recordKey(record), record]));
  }

  async get(workflowId: string, workflowVersion: number, recordId: string) {
    return this.records.get(workflowId + ':' + workflowVersion + ':' + recordId) ?? null;
  }

  async save(record: WorkflowRecord) {
    this.records.set(recordKey(record), record);
    writeSessionRecords([...this.records.values()]);
  }

  async delete(workflowId: string, workflowVersion: number, recordId: string) {
    this.records.delete(workflowId + ':' + workflowVersion + ':' + recordId);
    writeSessionRecords([...this.records.values()]);
  }

  all() {
    return [...this.records.values()];
  }
}

const definitions = {
  async get() {
    return equipmentMaintenanceWorkflow;
  },
  async save() {},
};

function getData(record: WorkflowRecord) {
  return record.data as Record<string, unknown>;
}

export const EquipmentMaintenanceWorkflow: React.FC<Props> = ({ onBack }) => {
  const [step, setStep] = useState<Step>('data');
  const [records, setRecords] = useState<WorkflowRecord[]>(() => readSessionRecords());
  const [qrImages, setQrImages] = useState<string[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<WorkflowRecord | null>(null);
  const [maintenanceDate, setMaintenanceDate] = useState('');
  const [maintenanceBy, setMaintenanceBy] = useState('');
  const [maintenanceNote, setMaintenanceNote] = useState('');
  const [lastScan, setLastScan] = useState<'success' | 'duplicate' | 'unknown' | null>(null);
  const [scannedIds, setScannedIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  const persistence = useMemo<WorkflowPersistence>(() => ({
    records: new MemoryRecordRepository(readSessionRecords()),
    definitions,
  }), []);

  const checkedCount = records.filter((record) => Boolean(getData(record).maintenanceDate)).length;

  const resolveRecord = async (payload: string) => {
    const runtime = new DefaultScanRuntime(
      qrPayloadDecoder,
      { async verify() { return true; } },
      {
        async resolve(workflowId: string, workflowVersion: number, recordId: string) {
          return persistence.records.get(workflowId, workflowVersion, recordId);
        },
      },
      {
        async get() {
          return equipmentMaintenanceWorkflow;
        },
      },
    );

    const result = await runtime.scan(payload);
    return result.record;
  };

  const handleScan = async (payload: string) => {
    try {
      setError('');
      const record = await resolveRecord(payload);
      if (!record) {
        setSelectedRecord(null);
        setLastScan('unknown');
        return;
      }

      const alreadyMaintained = Boolean(getData(record).maintenanceDate);
      setSelectedRecord(record);
      setMaintenanceDate(typeof getData(record).maintenanceDate === 'string' ? String(getData(record).maintenanceDate) : '');
      setMaintenanceBy(typeof getData(record).maintenanceBy === 'string' ? String(getData(record).maintenanceBy) : '');
      setMaintenanceNote(typeof getData(record).maintenanceNote === 'string' ? String(getData(record).maintenanceNote) : '');
      setLastScan(alreadyMaintained ? 'duplicate' : 'success');
      setScannedIds((prev) => [record.recordId, ...prev.filter((id) => id !== record.recordId)].slice(0, 8));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể đọc mã QR.');
      setLastScan('unknown');
    }
  };

  const {
    videoRef,
    isCameraActive,
    cameraError,
    startCamera,
    stopCamera,
    scanFile,
  } = useQRScanner({
    onDecoded: (payload) => {
      if (!payload.startsWith('qrtools:')) {
        setError('Đây không phải mã QR của workflow Bảo trì thiết bị.');
        setLastScan('unknown');
        return;
      }
      void handleScan(payload);
    },
    stopAfterDecode: false,
  });

  const importData = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      const input = new Uint8Array(await file.arrayBuffer());
      const source = createExcelDataSource(input, createXlsxParser());
      const service = new WorkflowImportService({
        persistence,
        qrEncoder: qrPayloadEncoder,
      });
      const result = await importEquipmentMaintenance(source, service);
      writeSessionRecords(result.records);
      setRecords(result.records);

      const images = await Promise.all(
        result.qrPayloads.map((payload) => QRCode.toDataURL(payload, {
          width: 180,
          margin: 2,
          errorCorrectionLevel: 'M',
        })),
      );
      setQrImages(images);
      setStep('print');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể import file Excel.');
    } finally {
      setLoading(false);
    }
  };

  const saveMaintenance = async () => {
    if (!selectedRecord) return;
    if (!maintenanceDate || !maintenanceBy.trim()) {
      setError('Vui lòng nhập ngày bảo trì và người thực hiện.');
      return;
    }

    const updated: WorkflowRecord = {
      ...selectedRecord,
      data: {
        ...selectedRecord.data,
        maintenanceDate,
        maintenanceBy: maintenanceBy.trim(),
        maintenanceNote: maintenanceNote.trim(),
      },
    };

    await persistence.records.save(updated);
    setRecords(readSessionRecords());
    setSelectedRecord(updated);
    setLastScan('success');
    setError('');
  };

  const exportCsv = () => {
    const csv = [
      'Asset ID,Asset Name,Location,Maintenance Date,Maintenance By,Maintenance Note',
      ...records.map((record) => {
        const data = getData(record);
        return [
          record.recordId,
          data.assetName ?? '',
          data.location ?? '',
          data.maintenanceDate ?? '',
          data.maintenanceBy ?? '',
          data.maintenanceNote ?? '',
        ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',');
      }),
    ].join('\\r\\n');

    const blob = new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `equipment-maintenance-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openPrintDialog = () => {
    if (!records.length) return;
    setShowPrintDialog(true);
  };

  const printQrLabels = () => {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!printWindow) {
      setError('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup rồi thử lại.');
      return;
    }

    const items = records.map((record, index) => {
      const data = getData(record);
      const image = qrImages[index];
      return `
        <article class="qr-card">
          ${image ? `<img src="${image}" alt="QR ${escapeHtml(record.recordId)}" />` : ''}
          <div class="id">${escapeHtml(record.recordId)}</div>
          <div class="name">${escapeHtml(String(data.assetName ?? ''))}</div>
          <div class="location">${escapeHtml(String(data.location ?? ''))}</div>
        </article>
      `;
    }).join('');

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>QR thiết bị</title>
          <style>
            @page { margin: 10mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, sans-serif; color: #111; }
            .sheet { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; }
            .qr-card { break-inside: avoid; page-break-inside: avoid; border: 1px solid #ddd; border-radius: 8px; padding: 6mm; text-align: center; }
            .qr-card img { width: 42mm; height: 42mm; display: block; margin: 0 auto 4mm; }
            .id { font: 10px monospace; color: #666; overflow-wrap: anywhere; }
            .name { margin-top: 2mm; font-size: 13px; font-weight: 700; }
            .location { margin-top: 1mm; font-size: 11px; color: #666; }
          </style>
        </head>
        <body>
          <main class="sheet">${items}</main>
          <script>
            window.addEventListener('load', function () {
              setTimeout(function () {
                window.focus();
                window.print();
              }, 150);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setShowPrintDialog(false);
  };

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const handleImageUpload = async (file?: File) => {
    if (!file) return;
    const payload = await scanFile(file);
    if (!payload) {
      setError('Không tìm thấy mã QR đọc được trong ảnh.');
      setLastScan('unknown');
      return;
    }
    if (!payload.startsWith('qrtools:')) {
      setError('Đây không phải mã QR của workflow Bảo trì thiết bị.');
      setLastScan('unknown');
      return;
    }
    await handleScan(payload);
  };

  const renderQrList = () => (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Danh sách thiết bị</h2>
          <p className="text-[11px] text-neutral-500">{records.length} QR đã tạo</p>
        </div>
      </div>
      <div className="divide-y divide-neutral-100">
        {records.map((record, index) => {
          const data = getData(record);
          return (
            <div key={record.recordId} className="p-3 flex items-center gap-3 print:break-inside-avoid">
              {qrImages[index] ? <img src={qrImages[index]} alt={`QR ${record.recordId}`} className="w-16 h-16 rounded-md shrink-0" /> : <QrCode className="w-10 h-10 text-neutral-400 shrink-0" />}
              <div className="min-w-0">
                <p className="text-xs font-mono text-neutral-500">{record.recordId}</p>
                <p className="text-sm font-semibold truncate">{String(data.assetName)}</p>
                <p className="text-xs text-neutral-500 truncate">{String(data.location)}</p>
              </div>
              <span className="ml-auto text-[11px] text-neutral-400">{getData(record).maintenanceDate ? 'Đã bảo trì' : 'Chưa bảo trì'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="pb-4 border-b border-neutral-200">
        <button type="button" onClick={() => { stopCamera(); onBack(); }} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 mb-2 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" />Quay lại Workflows
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">🔧 Bảo trì thiết bị</h1>
        </div>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">Danh sách → tạo & in QR → quét → ghi nhận bảo trì → xem kết quả.</p>
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-[11px] sm:text-xs">
        {(['data', 'print', 'scan', 'result'] as const).map((item, index) => (
          <div key={item} className={`rounded-lg px-2 py-2 text-center font-medium ${step === item ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
            {index + 1}. {item === 'data' ? 'Nhập danh sách' : item === 'print' ? 'Tạo & in QR' : item === 'scan' ? 'Bảo trì' : 'Kết quả'}
          </div>
        ))}
      </div>

      {step === 'data' && (
        <div className="grid md:grid-cols-[1fr_280px] gap-5">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">① Nhập danh sách thiết bị</h2>
            </div>
            <label className={`flex flex-col items-center justify-center gap-2 min-h-44 rounded-xl border-2 border-dashed border-neutral-300 hover:border-neutral-500 cursor-pointer ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
              <FileSpreadsheet className="w-7 h-7 text-neutral-400" />
              <span className="text-xs font-semibold">{loading ? 'Đang import...' : 'Chọn file Excel (.xlsx)'}</span>
              <span className="text-[11px] text-neutral-400">Asset ID · Asset Name · Location</span>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                disabled={loading}
                onChange={(event) => {
                  void importData(event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
            </label>
            <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 text-xs leading-5">
              <strong>Bắt buộc:</strong> Asset ID, Asset Name, Location<br />
              <strong>Tùy chọn:</strong> Maintenance Date, Maintenance Note
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 space-y-3">
            <h2 className="text-sm font-semibold">Quy trình</h2>
            <ol className="text-xs text-neutral-600 leading-6 list-decimal list-inside">
              <li>Import danh sách thiết bị.</li>
              <li>Tạo và in QR để dán lên thiết bị.</li>
              <li>Quét QR khi cần bảo trì.</li>
              <li>Nhập thông tin và lưu kết quả.</li>
            </ol>
          </div>
        </div>
      )}

      {step === 'print' && (
        <div className="max-w-2xl mx-auto bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 space-y-5">
          <div>
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Bước 2</p>
            <h2 className="text-lg font-bold text-neutral-900">Tạo & in QR cho thiết bị</h2>
            <p className="text-sm text-neutral-500 mt-1">Đã có <strong className="text-neutral-900">{records.length} thiết bị</strong>. Mỗi thiết bị có một QR riêng.</p>
          </div>
          <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-xs text-neutral-600 space-y-1.5">
            <p>• In QR và dán lên thiết bị trước khi sử dụng.</p>
            <p>• Nếu đã dán QR từ trước, có thể bỏ qua bước in.</p>
          </div>
          <div className="flex flex-wrap justify-center sm:justify-end gap-2">
            <button type="button" onClick={openPrintDialog} className="h-10 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
              <Printer className="w-3.5 h-3.5" />Tạo & in QR
            </button>
            <button type="button" onClick={() => setStep('scan')} className="h-10 px-4 rounded-lg bg-white border border-neutral-300 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
              Tôi đã có QR <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button type="button" onClick={() => setStep('data')} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Quay lại danh sách</button>
            <button type="button" onClick={() => setStep('scan')} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">Tiếp tục bảo trì <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

      {step === 'scan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => { stopCamera(); setStep('print'); }} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Quay lại tạo & in QR</button>
            <button type="button" onClick={() => { stopCamera(); setStep('result'); }} className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">Kết quả <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-5">
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
              <div className="relative aspect-video bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center">
                {isCameraActive ? <video ref={videoRef} playsInline muted className="w-full h-full object-cover" /> : <div className="text-center text-neutral-400"><Camera className="w-10 h-10 mx-auto mb-2" /><p className="text-xs">Bấm bắt đầu để quét</p></div>}
                {isCameraActive && <div className="absolute inset-[12%] border-2 border-white/80 rounded-2xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]" />}
              </div>
              {cameraError && <div className="text-xs text-red-600">{cameraError}</div>}
              {error && <div className="text-xs text-red-600">{error}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={isCameraActive ? stopCamera : startCamera} className={`flex-1 h-9 rounded-lg text-xs font-semibold cursor-pointer ${isCameraActive ? 'bg-red-600 text-white' : 'bg-neutral-900 text-white'}`}>
                  <Camera className="inline w-3.5 h-3.5 mr-1" />{isCameraActive ? 'Dừng camera' : 'Bắt đầu quét'}
                </button>
                <label className="flex-1 h-9 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />Quét bằng ảnh
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleImageUpload(event.target.files?.[0])} />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                {!lastScan ? (
                  <div className="py-8 text-center text-neutral-400 text-xs">Đang chờ quét...</div>
                ) : lastScan === 'success' ? (
                  <div className="text-center py-5"><CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" /><p className="mt-2 text-xs font-semibold text-emerald-700">ĐÃ LƯU BẢO TRÌ</p></div>
                ) : lastScan === 'duplicate' ? (
                  <div className="text-center py-5"><AlertTriangle className="w-10 h-10 mx-auto text-amber-600" /><p className="mt-2 text-xs font-semibold text-amber-700">THIẾT BỊ ĐÃ CÓ LẦN BẢO TRÌ</p></div>
                ) : (
                  <div className="text-center py-5"><XCircle className="w-10 h-10 mx-auto text-red-600" /><p className="mt-2 text-xs font-semibold text-red-700">KHÔNG TÌM THẤY</p><p className="text-xs text-neutral-500 mt-2">QR này không thuộc danh sách thiết bị.</p></div>
                )}
              </div>

              {selectedRecord && (
                <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
                  <div>
                    <p className="text-xs font-mono text-neutral-500">{selectedRecord.recordId}</p>
                    <h2 className="text-lg font-bold text-neutral-900">{String(getData(selectedRecord).assetName)}</h2>
                    <p className="text-xs text-neutral-500">{String(getData(selectedRecord).location)}</p>
                  </div>
                  <div className="border-t border-neutral-100 pt-4 space-y-3">
                    <h3 className="text-sm font-semibold">Ghi nhận bảo trì</h3>
                    <label className="block"><span className="text-xs font-medium text-neutral-600">Ngày bảo trì</span><input type="date" value={maintenanceDate} onChange={(e) => setMaintenanceDate(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-lg border border-neutral-200 text-sm" /></label>
                    <label className="block"><span className="text-xs font-medium text-neutral-600">Người thực hiện</span><input value={maintenanceBy} onChange={(e) => setMaintenanceBy(e.target.value)} placeholder="Tên kỹ thuật viên" className="mt-1 w-full h-9 px-3 rounded-lg border border-neutral-200 text-sm" /></label>
                    <label className="block"><span className="text-xs font-medium text-neutral-600">Ghi chú</span><textarea value={maintenanceNote} onChange={(e) => setMaintenanceNote(e.target.value)} rows={3} placeholder="Tình trạng, nội dung sửa chữa..." className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm resize-none" /></label>
                    <button type="button" onClick={() => void saveMaintenance()} className="w-full h-9 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer">Lưu lần bảo trì</button>
                  </div>
                </div>
              )}

              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Tiến độ</h2><span className="text-xs text-neutral-500">{checkedCount}/{records.length}</span></div>
                <div className="h-2 rounded-full bg-neutral-100 mt-3 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${records.length ? checkedCount / records.length * 100 : 0}%` }} /></div>
                <button type="button" onClick={() => { stopCamera(); setStep('result'); }} className="w-full mt-4 h-9 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer">Xem kết quả</button>
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <h2 className="text-sm font-semibold">Quét gần đây</h2>
                <div className="mt-3 space-y-2 max-h-44 overflow-auto">
                  {scannedIds.map((id) => <div key={id} className="text-xs font-mono">{id}</div>)}
                  {!scannedIds.length && <p className="text-xs text-neutral-400">Chưa có thiết bị nào được quét.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'result' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-sm font-semibold">Kết quả bảo trì</h2><p className="text-xs text-neutral-500 mt-1">{checkedCount}/{records.length} thiết bị đã có ghi nhận.</p></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={exportCsv} className="h-9 px-3 rounded-lg border border-neutral-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><Download className="w-3.5 h-3.5" />Xuất CSV</button>
              <button type="button" onClick={() => setStep('scan')} className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ScanLine className="w-3.5 h-3.5" />Bảo trì tiếp</button>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-neutral-50 text-neutral-500"><tr><th className="text-left px-3 py-2 font-medium">Mã</th><th className="text-left px-3 py-2 font-medium">Thiết bị</th><th className="text-left px-3 py-2 font-medium">Vị trí</th><th className="text-left px-3 py-2 font-medium">Ngày</th><th className="text-left px-3 py-2 font-medium">Người thực hiện</th><th className="text-left px-3 py-2 font-medium">Ghi chú</th></tr></thead>
              <tbody>{records.map((record) => { const data = getData(record); return <tr key={record.recordId} className="border-t border-neutral-100"><td className="px-3 py-2 font-mono">{record.recordId}</td><td className="px-3 py-2 font-medium">{String(data.assetName)}</td><td className="px-3 py-2">{String(data.location)}</td><td className="px-3 py-2">{data.maintenanceDate ? String(data.maintenanceDate) : '—'}</td><td className="px-3 py-2">{data.maintenanceBy ? String(data.maintenanceBy) : '—'}</td><td className="px-3 py-2 text-neutral-500">{data.maintenanceNote ? String(data.maintenanceNote) : '—'}</td></tr>; })}</tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => setStep('scan')} className="h-9 px-3 rounded-lg bg-neutral-100 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Quay lại bảo trì</button>
            <button type="button" onClick={() => { stopCamera(); setStep('data'); setRecords([]); setQrImages([]); setSelectedRecord(null); setLastScan(null); setScannedIds([]); setError(''); }} className="text-xs text-neutral-500 hover:text-neutral-900 cursor-pointer">Bắt đầu workflow mới</button>
          </div>
        </div>
      )}
    </div>

      {showPrintDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="equipment-print-title">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-neutral-200">
              <div>
                <h2 id="equipment-print-title" className="text-sm font-semibold">Tạo & in QR</h2>
                <p className="text-xs text-neutral-500 mt-1">{records.length} mã QR sẽ được in.</p>
              </div>
              <button type="button" onClick={() => setShowPrintDialog(false)} className="h-8 w-8 rounded-lg bg-neutral-100 text-neutral-600 hover:text-neutral-900 text-lg leading-none cursor-pointer" aria-label="Đóng">×</button>
            </div>

            <div className="max-h-[65vh] overflow-auto p-5 bg-neutral-50">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {records.map((record, index) => {
                  const data = getData(record);
                  return (
                    <div key={record.recordId} className="bg-white border border-neutral-200 rounded-xl p-3 text-center">
                      {qrImages[index] ? <img src={qrImages[index]} alt={`QR ${record.recordId}`} className="w-32 h-32 mx-auto object-contain" /> : <QrCode className="w-16 h-16 mx-auto text-neutral-400" />}
                      <p className="mt-2 text-[10px] font-mono text-neutral-500 break-all">{record.recordId}</p>
                      <p className="mt-1 text-xs font-semibold truncate">{String(data.assetName ?? '')}</p>
                      <p className="text-[11px] text-neutral-500 truncate">{String(data.location ?? '')}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-neutral-200">
              <button type="button" onClick={() => setShowPrintDialog(false)} className="h-9 px-4 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold cursor-pointer">Hủy</button>
              <button type="button" onClick={printQrLabels} className="h-9 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                <Printer className="w-3.5 h-3.5" />In {records.length} QR
              </button>
            </div>
          </div>
        </div>
      )}
  );
};
