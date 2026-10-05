import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  QrCode,
  ScanLine,
  Upload,
  Wrench,
} from 'lucide-react';
import { createExcelDataSource, createXlsxParser } from '../../packages/connectors/src/index.ts';
import { WorkflowImportService } from '../../packages/workflow-engine/src/index.ts';
import { DefaultScanRuntime } from '../../packages/workflow-engine/src/scan.ts';
import type { WorkflowPersistence } from '../../packages/workflow-engine/src/persistence.ts';
import {
  equipmentMaintenanceWorkflow,
} from '../../packages/workflows/equipment-maintenance/src/index.ts';
import { importEquipmentMaintenance } from '../../packages/workflows/equipment-maintenance/src/import.ts';
import { qrPayloadEncoder, qrPayloadDecoder } from '../../packages/qr-engine/src/index.ts';
import type { WorkflowRecord } from '../../packages/types/src/index.ts';

interface Props {
  onBack: () => void;
  initialScanPayload?: string | null;
  onOpenScanner: () => void;
}

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

class MemoryRecordRepository {
  private records: Map<string, WorkflowRecord>;

  constructor(initialRecords: WorkflowRecord[] = []) {
    this.records = new Map(
      initialRecords.map((record) => [
        this.key(record.workflowId, record.workflowVersion, record.recordId),
        record,
      ]),
    );
  }

  async get(workflowId: string, workflowVersion: number, recordId: string) {
    return this.records.get(this.key(workflowId, workflowVersion, recordId)) ?? null;
  }

  async save(record: WorkflowRecord) {
    this.records.set(this.key(record.workflowId, record.workflowVersion, record.recordId), record);
    writeSessionRecords(this.all());
  }

  async delete(workflowId: string, workflowVersion: number, recordId: string) {
    this.records.delete(this.key(workflowId, workflowVersion, recordId));
    writeSessionRecords(this.all());
  }

  all() {
    return [...this.records.values()];
  }

  private key(workflowId: string, workflowVersion: number, recordId: string) {
    return workflowId + ':' + workflowVersion + ':' + recordId;
  }
}

const emptyDefinitions = {
  async get() {
    return equipmentMaintenanceWorkflow;
  },
  async save() {},
};

export const EquipmentMaintenanceWorkflow: React.FC<Props> = ({
  onBack,
  initialScanPayload,
  onOpenScanner,
}) => {
  const [step, setStep] = useState<'upload' | 'records' | 'print' | 'detail'>(
    initialScanPayload ? 'detail' : 'upload',
  );
  const [records, setRecords] = useState<WorkflowRecord[]>(() => readSessionRecords());
  const [qrImages, setQrImages] = useState<string[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<WorkflowRecord | null>(null);
  const [maintenanceDate, setMaintenanceDate] = useState('');
  const [maintenanceNote, setMaintenanceNote] = useState('');
  const [maintenanceBy, setMaintenanceBy] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const persistence = useMemo<WorkflowPersistence>(() => ({
    records: new MemoryRecordRepository(readSessionRecords()),
    definitions: emptyDefinitions,
  }), []);

  useEffect(() => {
    if (!initialScanPayload) return;

    const resolveScannedRecord = async () => {
      try {
        setError('');
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
        const result = await runtime.scan(initialScanPayload);
        if (!result.record) throw new Error('Không tìm thấy thiết bị cho mã QR này.');

        const record = result.record;
        const data = record.data as Record<string, unknown>;
        setSelectedRecord(record);
        setMaintenanceDate(typeof data.maintenanceDate === 'string' ? data.maintenanceDate : '');
        setMaintenanceNote(typeof data.maintenanceNote === 'string' ? data.maintenanceNote : '');
        setMaintenanceBy(typeof data.maintenanceBy === 'string' ? data.maintenanceBy : '');
        setStep('detail');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không thể resolve mã QR.');
      }
    };

    void resolveScannedRecord();
  }, [initialScanPayload, persistence]);

  const runImport = async (file: File) => {
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
        result.qrPayloads.map((payload) =>
          QRCode.toDataURL(payload, {
            width: 180,
            margin: 2,
            errorCorrectionLevel: 'M',
          }),
        ),
      );
      setQrImages(images);
      setStep('records');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể import file Excel.');
    } finally {
      setLoading(false);
    }
  };

  const openPrint = () => {
    setError('');
    setStep('print');
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
        maintenanceNote: maintenanceNote.trim(),
        maintenanceBy: maintenanceBy.trim(),
      },
    };

    await persistence.records.save(updated);
    setRecords(persistence.records.all());
    setSelectedRecord(updated);
    setError('');
  };

  const renderQrCards = () => (
    <div className="grid md:grid-cols-2 gap-4">
      {records.map((record, index) => {
        const data = record.data as Record<string, unknown>;
        return (
          <article
            key={record.recordId}
            className="rounded-2xl border border-neutral-200 bg-white p-5 print:break-inside-avoid"
          >
            <div className="flex gap-4">
              {qrImages[index] && (
                <img
                  src={qrImages[index]}
                  alt={`QR ${record.recordId}`}
                  className="w-28 h-28 shrink-0 rounded-lg"
                />
              )}
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-mono text-neutral-500">{record.recordId}</p>
                <h3 className="text-sm font-semibold text-neutral-900">
                  {String(data.assetName)}
                </h3>
                <p className="text-xs text-neutral-500">{String(data.location)}</p>
                <p className="text-[11px] text-neutral-400">Quét QR để ghi nhận bảo trì</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-200 print:hidden">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Quay lại Workflows
          </button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Bảo trì thiết bị
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Import → tạo QR → in → quét bằng camera → ghi nhận bảo trì.
          </p>
        </div>
        <Wrench className="w-6 h-6 text-neutral-500" />
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-[11px] sm:text-xs print:hidden">
        {(['upload', 'records', 'print', 'detail'] as const).map((item, i) => (
          <div
            key={item}
            className={`rounded-lg px-2 py-2 text-center font-medium ${
              step === item ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            {i + 1}. {item === 'upload' ? 'Import' : item === 'records' ? 'Tạo QR' : item === 'print' ? 'In QR' : 'Bảo trì'}
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <div className="max-w-2xl mx-auto rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">1. Import danh sách thiết bị</h2>
              <p className="text-xs text-neutral-500 mt-1">Upload file .xlsx để tạo record và QR.</p>
            </div>
          </div>
          <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-xs leading-6">
            <strong>Cột bắt buộc:</strong> Asset ID, Asset Name, Location<br />
            <strong>Cột tùy chọn:</strong> Maintenance Date, Maintenance Note
          </div>
          <label className={`flex flex-col items-center justify-center gap-2 min-h-36 rounded-xl border-2 border-dashed border-neutral-300 hover:border-neutral-500 cursor-pointer ${
            loading ? 'opacity-50 pointer-events-none' : ''
          }`}>
            <Upload className="w-6 h-6 text-neutral-400" />
            <span className="text-xs font-semibold">
              {loading ? 'Đang import...' : 'Chọn file Excel (.xlsx)'}
            </span>
            <span className="text-[11px] text-neutral-400">File được xử lý ngay trong trình duyệt</span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              disabled={loading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void runImport(file);
                e.currentTarget.value = '';
              }}
            />
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}

      {step === 'records' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Đã tạo {records.length} thiết bị và QR
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Kiểm tra danh sách trước khi in.
              </p>
            </div>
          </div>
          {renderQrCards()}
          <div className="flex justify-end print:hidden">
            <button
              type="button"
              onClick={openPrint}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              Tiếp tục: In QR
            </button>
          </div>
        </div>
      )}

      {step === 'print' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 print:hidden">
            <p className="text-sm font-semibold text-blue-900">2. In QR và dán lên thiết bị</p>
            <p className="text-xs text-blue-700 mt-1">
              Mỗi QR chỉ chứa identity của record. Sau khi dán, dùng camera QR Tools để quét.
            </p>
          </div>
          {renderQrCards()}
          <div className="flex flex-wrap justify-between gap-2 print:hidden">
            <button
              type="button"
              onClick={() => setStep('records')}
              className="h-10 px-4 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold cursor-pointer"
            >
              ← Quay lại
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                In QR
              </button>
              <button
                type="button"
                onClick={onOpenScanner}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
              >
                <ScanLine className="w-4 h-4" />
                Mở camera quét
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'detail' && selectedRecord && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">Đã xác định thiết bị</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                QR → decode → verify → resolve thành công.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                <QrCode className="w-6 h-6 text-neutral-700" />
              </div>
              <div>
                <p className="text-xs font-mono text-neutral-500">{selectedRecord.recordId}</p>
                <h2 className="text-lg font-bold text-neutral-900">
                  {String((selectedRecord.data as Record<string, unknown>).assetName)}
                </h2>
                <p className="text-sm text-neutral-500">
                  {String((selectedRecord.data as Record<string, unknown>).location)}
                </p>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-5 space-y-4">
              <h3 className="text-sm font-semibold text-neutral-900">Ghi nhận bảo trì</h3>
              <label className="block">
                <span className="text-xs font-medium text-neutral-600">Ngày bảo trì</span>
                <input
                  type="date"
                  value={maintenanceDate}
                  onChange={(e) => setMaintenanceDate(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border border-neutral-200 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-neutral-600">Người thực hiện</span>
                <input
                  value={maintenanceBy}
                  onChange={(e) => setMaintenanceBy(e.target.value)}
                  placeholder="Tên kỹ thuật viên"
                  className="mt-1 w-full h-10 px-3 rounded-lg border border-neutral-200 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-neutral-600">Ghi chú</span>
                <textarea
                  value={maintenanceNote}
                  onChange={(e) => setMaintenanceNote(e.target.value)}
                  placeholder="Nội dung bảo trì, linh kiện thay thế, tình trạng..."
                  rows={4}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm resize-none"
                />
              </label>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="button"
                onClick={() => void saveMaintenance()}
                className="w-full h-10 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer"
              >
                Lưu lần bảo trì
              </button>
            </div>
          </div>

          <div className="flex justify-between print:hidden">
            <button
              type="button"
              onClick={() => setStep('print')}
              className="h-9 px-3 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold cursor-pointer"
            >
              ← Danh sách QR
            </button>
            <button
              type="button"
              onClick={onOpenScanner}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
            >
              <ScanLine className="w-4 h-4" />
              Quét thiết bị khác
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
