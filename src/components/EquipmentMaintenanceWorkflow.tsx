import React, { useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { ArrowLeft, CheckCircle2, FileSpreadsheet, QrCode, Upload } from 'lucide-react';
import { createExcelDataSource, createXlsxParser } from '../../packages/connectors/src/index.ts';
import { WorkflowImportService } from '../../packages/workflow-engine/src/index.ts';
import { DefaultScanRuntime } from '../../packages/workflow-engine/src/scan.ts';
import type { WorkflowPersistence } from '../../packages/workflow-engine/src/persistence.ts';
import {
  createEquipmentMaintenanceRecord,
  EquipmentMaintenanceMapper,
  EquipmentMaintenanceValidator,
  equipmentMaintenanceWorkflow,
} from '../../packages/workflows/equipment-maintenance/src/index.ts';
import { importEquipmentMaintenance } from '../../packages/workflows/equipment-maintenance/src/import.ts';
import { qrPayloadEncoder, qrPayloadDecoder } from '../../packages/qr-engine/src/index.ts';
import type { WorkflowRecord } from '../../packages/types/src/index.ts';

interface Props {
  onBack: () => void;
}

class MemoryRecordRepository {
  private records = new Map<string, WorkflowRecord>();

  async get(workflowId: string, workflowVersion: number, recordId: string) {
    return this.records.get(this.key(workflowId, workflowVersion, recordId)) ?? null;
  }

  async save(record: WorkflowRecord) {
    this.records.set(this.key(record.workflowId, record.workflowVersion, record.recordId), record);
  }

  async delete(workflowId: string, workflowVersion: number, recordId: string) {
    this.records.delete(this.key(workflowId, workflowVersion, recordId));
  }

  all() {
    return [...this.records.values()];
  }

  private key(workflowId: string, workflowVersion: number, recordId: string) {
    return workflowId + ':' + workflowVersion + ':' + recordId;
  }
}

const emptyDefinitions = {
  async get() { return equipmentMaintenanceWorkflow; },
  async save() {},
};

export const EquipmentMaintenanceWorkflow: React.FC<Props> = ({ onBack }) => {
  const [step, setStep] = useState<'upload' | 'records' | 'result'>('upload');
  const [records, setRecords] = useState<WorkflowRecord[]>([]);
  const [payloads, setPayloads] = useState<string[]>([]);
  const [qrImages, setQrImages] = useState<string[]>([]);
  const [selectedResult, setSelectedResult] = useState<{ recordId: string; workflowId: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const persistence = useMemo<WorkflowPersistence>(() => {
    const recordsRepository = new MemoryRecordRepository();
    return {
      records: recordsRepository,
      definitions: emptyDefinitions,
    };
  }, []);

  const runImport = async (file: File) => {
    setLoading(true);
    setError('');
    setSelectedResult(null);

    try {
      const input = new Uint8Array(await file.arrayBuffer());
      const source = createExcelDataSource(input, createXlsxParser());
      const service = new WorkflowImportService({
        persistence,
        qrEncoder: qrPayloadEncoder,
      });

      const result = await importEquipmentMaintenance(source, service);
      const images = await Promise.all(
        result.qrPayloads.map((payload) =>
          QRCode.toDataURL(payload, {
            width: 180,
            margin: 2,
            errorCorrectionLevel: 'M',
          }),
        ),
      );

      setRecords(result.records);
      setPayloads(result.qrPayloads);
      setQrImages(images);
      setStep('records');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể import file Excel.');
    } finally {
      setLoading(false);
    }
  };

  const testScan = async (index: number) => {
    const record = records[index];
    if (!record) return;

    const resolver = {
      async resolve(workflowId: string, workflowVersion: number, recordId: string) {
        return persistence.records.get(workflowId, workflowVersion, recordId);
      },
    };

    const registry = {
      async get() {
        return equipmentMaintenanceWorkflow;
      },
    };

    const runtime = new DefaultScanRuntime(
      qrPayloadDecoder,
      { async verify() { return true; } },
      resolver,
      registry,
    );

    try {
      const result = await runtime.scan(payloads[index]);
      if (!result.record) throw new Error('Không resolve được record.');
      setSelectedResult({
        recordId: result.record.recordId,
        workflowId: result.record.workflowId,
      });
      setStep('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan runtime thất bại.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 mb-2 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" />Quay lại Workflows
          </button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">🔧 Bảo trì thiết bị</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">Test end-to-end: Excel → Workflow → lưu record → QR → Scan → Resolve.</p>
        </div>
        <span className="text-[11px] font-mono uppercase bg-emerald-50 px-2 py-1 rounded text-emerald-700">E2E Test</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-[11px] sm:text-xs">
        {(['upload', 'records', 'result'] as const).map((item, i) => (
          <div key={item} className={`rounded-lg px-2 py-2 text-center font-medium ${step === item ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
            {i + 1}. {item === 'upload' ? 'Import Excel' : item === 'records' ? 'Records + QR' : 'Scan + Resolve'}
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <div className="max-w-2xl mx-auto rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center"><FileSpreadsheet className="w-5 h-5" /></div>
            <div><h2 className="text-sm font-semibold">1. Import danh sách thiết bị</h2><p className="text-xs text-neutral-500 mt-1">Upload file .xlsx với các cột bên dưới.</p></div>
          </div>
          <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-xs leading-6">
            <strong>Cột bắt buộc:</strong> Asset ID, Asset Name, Location<br />
            <strong>Cột tùy chọn:</strong> Maintenance Date, Maintenance Note
          </div>
          <label className={`flex flex-col items-center justify-center gap-2 min-h-36 rounded-xl border-2 border-dashed border-neutral-300 hover:border-neutral-500 cursor-pointer ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload className="w-6 h-6 text-neutral-400" />
            <span className="text-xs font-semibold">{loading ? 'Đang import...' : 'Chọn file Excel (.xlsx)'}</span>
            <span className="text-[11px] text-neutral-400">File được xử lý ngay trong trình duyệt</span>
            <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" disabled={loading} onChange={e => { const file = e.target.files?.[0]; if (file) void runImport(file); e.currentTarget.value = ''; }} />
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}

      {step === 'records' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div><p className="text-sm font-semibold text-emerald-900">Import thành công {records.length} thiết bị</p><p className="text-xs text-emerald-700 mt-0.5">Record đã được lưu vào persistence và QR identity đã được tạo.</p></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {records.map((record, index) => {
              const data = record.data as Record<string, unknown>;
              return (
                <article key={record.recordId} className="rounded-2xl border border-neutral-200 bg-white p-5">
                  <div className="flex gap-4">
                    {qrImages[index] && <img src={qrImages[index]} alt={`QR ${record.recordId}`} className="w-28 h-28 shrink-0 rounded-lg" />}
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-mono text-neutral-500">{record.recordId}</p>
                      <h3 className="text-sm font-semibold text-neutral-900">{String(data.assetName)}</h3>
                      <p className="text-xs text-neutral-500">{String(data.location)}</p>
                      {typeof data.maintenanceDate === 'string' && <p className="text-xs text-neutral-500">Bảo trì: {data.maintenanceDate}</p>}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700"><QrCode className="w-3.5 h-3.5" />Identity QR</span>
                    <button type="button" onClick={() => void testScan(index)} className="h-8 px-3 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer">Test Scan → Resolve</button>
                  </div>
                </article>
              );
            })}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}

      {step === 'result' && selectedResult && (
        <div className="max-w-xl mx-auto rounded-2xl border border-emerald-200 bg-white p-6 sm:p-8 space-y-5">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-6 h-6" /></div>
            <h2 className="text-lg font-bold text-neutral-900 mt-3">Scan → Resolve thành công</h2>
            <p className="text-xs text-neutral-500 mt-1">QR identity đã được decode, verify và resolve về record.</p>
          </div>
          <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-xs space-y-2">
            <div className="flex justify-between gap-3"><span className="text-neutral-500">Workflow</span><code>{selectedResult.workflowId}</code></div>
            <div className="flex justify-between gap-3"><span className="text-neutral-500">Record</span><code>{selectedResult.recordId}</code></div>
          </div>
          <button type="button" onClick={() => setStep('records')} className="w-full h-9 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer">← Xem danh sách QR</button>
        </div>
      )}
    </div>
  );
};
