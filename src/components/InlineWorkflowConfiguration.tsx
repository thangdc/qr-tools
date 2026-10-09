import React, { useMemo, useState } from 'react';
import { Download, Plus, Settings2, Trash2, X } from 'lucide-react';
import type { WorkflowFieldDefinition, WorkflowInputSource, WorkflowRecord, WorkflowValueType } from '../workflows/configuration';
import { mapWorkflowInput, validateWorkflowRecord } from '../workflows/configuration';

const STORAGE_PREFIX = 'qr_tools_workflow_definitions_v1';
const sources: WorkflowInputSource[] = ['manual', 'excel', 'qr'];
const types: WorkflowValueType[] = ['text', 'number', 'date', 'email', 'url', 'phone', 'checkbox'];

interface InlineDefinition {
  id: string;
  name: string;
  version: number;
  fields: WorkflowFieldDefinition[];
  mappings: Array<{ source: WorkflowInputSource; from: string; to: string; transform?: 'trim' | 'uppercase' | 'lowercase' | 'number' | 'date' }>;
  outputs: Array<{ id: string; label: string; kind: 'record' | 'qr' | 'csv' | 'excel' | 'print' | 'webhook'; enabled: boolean; fields?: string[]; template?: string }>;
}

const defaults: Record<string, InlineDefinition> = {
  checkin: { id: 'checkin', name: 'Điểm danh / Check-in', version: 1, fields: [
    { key: 'name', label: 'Họ tên', type: 'text', sources, validation: { required: true } },
    { key: 'recordCode', label: 'Mã điểm danh', type: 'text', sources, validation: { required: true } },
  ], mappings: [{ source: 'excel', from: 'Tên', to: 'name', transform: 'trim' }, { source: 'excel', from: 'Mã', to: 'recordCode', transform: 'trim' }], outputs: [{ id: 'csv', label: 'Xuất CSV', kind: 'csv', enabled: true }] },
  'bulk-print': { id: 'bulk-print', name: 'Tạo QR hàng loạt & In', version: 1, fields: [
    { key: 'label', label: 'Tên QR', type: 'text', sources, validation: { required: true } },
    { key: 'payload', label: 'Nội dung QR', type: 'text', sources, validation: { required: true } },
  ], mappings: [{ source: 'excel', from: 'Tên', to: 'label', transform: 'trim' }, { source: 'excel', from: 'Nội dung', to: 'payload', transform: 'trim' }], outputs: [{ id: 'qr', label: 'Tạo QR', kind: 'qr', enabled: true }, { id: 'csv', label: 'Xuất CSV', kind: 'csv', enabled: true }, { id: 'print', label: 'In', kind: 'print', enabled: true }] },
  assets: { id: 'assets', name: 'Quản lý tài sản', version: 1, fields: [
    { key: 'assetCode', label: 'Mã tài sản', type: 'text', sources, validation: { required: true } },
    { key: 'assetName', label: 'Tên tài sản', type: 'text', sources, validation: { required: true } },
    { key: 'location', label: 'Vị trí', type: 'text', sources, validation: {} },
  ], mappings: [{ source: 'excel', from: 'Asset ID', to: 'assetCode', transform: 'trim' }, { source: 'excel', from: 'Asset Name', to: 'assetName', transform: 'trim' }, { source: 'excel', from: 'Location', to: 'location', transform: 'trim' }], outputs: [{ id: 'record', label: 'Xem dữ liệu', kind: 'record', enabled: true }, { id: 'qr', label: 'Tạo QR', kind: 'qr', enabled: true }, { id: 'csv', label: 'Xuất CSV', kind: 'csv', enabled: true }] },
  inventory: { id: 'inventory', name: 'Kiểm kê hàng hóa', version: 1, fields: [
    { key: 'itemCode', label: 'Mã hàng', type: 'text', sources, validation: { required: true } },
    { key: 'itemName', label: 'Tên hàng', type: 'text', sources, validation: { required: true } },
    { key: 'quantity', label: 'Số lượng', type: 'number', sources, validation: { required: true, min: 0 } },
  ], mappings: [{ source: 'excel', from: 'Mã hàng', to: 'itemCode', transform: 'trim' }, { source: 'excel', from: 'Tên hàng', to: 'itemName', transform: 'trim' }, { source: 'excel', from: 'Số lượng', to: 'quantity', transform: 'number' }], outputs: [{ id: 'csv', label: 'Xuất CSV', kind: 'csv', enabled: true }] },
  rooms: { id: 'rooms', name: 'Quản lý phòng / căn hộ', version: 1, fields: [
    { key: 'roomCode', label: 'Mã phòng', type: 'text', sources, validation: { required: true } },
    { key: 'roomName', label: 'Tên phòng / căn hộ', type: 'text', sources, validation: { required: true } },
  ], mappings: [{ source: 'excel', from: 'Mã phòng', to: 'roomCode', transform: 'trim' }, { source: 'excel', from: 'Tên phòng', to: 'roomName', transform: 'trim' }], outputs: [{ id: 'qr', label: 'Tạo QR', kind: 'qr', enabled: true }, { id: 'csv', label: 'Xuất CSV', kind: 'csv', enabled: true }] },
  payment: { id: 'payment', name: 'Thu tiền / Thanh toán', version: 1, fields: [
    { key: 'reference', label: 'Mã thanh toán', type: 'text', sources, validation: { required: true } },
    { key: 'payer', label: 'Người thanh toán', type: 'text', sources, validation: { required: true } },
    { key: 'amount', label: 'Số tiền', type: 'number', sources, validation: { required: true, min: 1 } },
  ], mappings: [{ source: 'excel', from: 'Mã thanh toán', to: 'reference', transform: 'trim' }, { source: 'excel', from: 'Người thanh toán', to: 'payer', transform: 'trim' }, { source: 'excel', from: 'Số tiền', to: 'amount', transform: 'number' }], outputs: [{ id: 'qr', label: 'Tạo QR thanh toán', kind: 'qr', enabled: true }, { id: 'csv', label: 'Xuất CSV', kind: 'csv', enabled: true }] },
  'equipment-maintenance': { id: 'equipment-maintenance', name: 'Bảo trì thiết bị', version: 1, fields: [
    { key: 'assetCode', label: 'Mã thiết bị', type: 'text', sources, validation: { required: true } },
    { key: 'assetName', label: 'Tên thiết bị', type: 'text', sources, validation: { required: true } },
    { key: 'maintenanceDate', label: 'Ngày bảo trì', type: 'date', sources, validation: {} },
  ], mappings: [{ source: 'excel', from: 'Mã thiết bị', to: 'assetCode', transform: 'trim' }, { source: 'excel', from: 'Tên thiết bị', to: 'assetName', transform: 'trim' }, { source: 'excel', from: 'Ngày bảo trì', to: 'maintenanceDate', transform: 'date' }], outputs: [{ id: 'qr', label: 'Tạo QR', kind: 'qr', enabled: true }, { id: 'csv', label: 'Xuất CSV', kind: 'csv', enabled: true }] },
};

function loadDefinition(workflowId: string): InlineDefinition {
  const fallback = defaults[workflowId] ?? defaults.assets;
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_PREFIX) || '[]') as InlineDefinition[];
    const stored = all.find(item => item.id === workflowId);
    if (stored && Array.isArray(stored.fields) && Array.isArray(stored.mappings) && Array.isArray(stored.outputs)) return stored;
  } catch { /* fall back to workflow defaults */ }
  return fallback;
}

function parseTabular(text: string): WorkflowRecord[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map(value => value.trim());
  return lines.slice(1).map(line => Object.fromEntries(line.split(delimiter).map((value, index) => [headers[index] ?? `column${index + 1}`, value.trim()])));
}

function downloadCsv(rows: WorkflowRecord[], fields: WorkflowFieldDefinition[]) {
  const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [fields.map(field => quote(field.label)).join(','), ...rows.map(row => fields.map(field => quote(row[field.key])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'workflow-output.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

interface Props { workflowId: string; }
export const InlineWorkflowConfiguration: React.FC<Props> = ({ workflowId }) => {
  const [open, setOpen] = useState(false);
  const [definition, setDefinition] = useState<InlineDefinition>(() => loadDefinition(workflowId));
  const [input, setInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [outputKind, setOutputKind] = useState('csv');
  const parsed = useMemo(() => parseTabular(input), [input]);
  const preview = useMemo(() => parsed.map(row => mapWorkflowInput(definition, 'excel', row)), [definition, parsed]);
  const issues = useMemo(() => preview.flatMap((row, index) => validateWorkflowRecord(definition, row).issues.map(issue => ({ ...issue, row: index + 1 }))), [definition, preview]);
  const enabledOutputs = definition.outputs.filter(output => output.enabled);
  const visibleFields = definition.fields;
  const changeField = (index: number, patch: Partial<WorkflowFieldDefinition>) => setDefinition(current => ({ ...current, fields: current.fields.map((field, i) => i === index ? { ...field, ...patch } : field) }));
  const save = () => {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_PREFIX) || '[]') as InlineDefinition[];
      localStorage.setItem(STORAGE_PREFIX, JSON.stringify([...all.filter(item => item.id !== workflowId), definition]));
      setSaved(true);
    } catch { setSaved(false); }
  };

  return <section className="mb-5 rounded-2xl border border-blue-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Settings2 className="h-4 w-4" /></span>
        <div><h2 className="text-sm font-semibold text-neutral-900">Cấu hình dữ liệu · {definition.name}</h2><p className="mt-0.5 text-xs text-neutral-500">Chỉnh field, xem mapping/validation và preview output ngay trong workflow.</p></div>
      </div>
      <button type="button" onClick={() => setOpen(value => !value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">{open ? 'Thu gọn' : 'Tùy chỉnh dữ liệu'}</button>
    </div>
    {open && <div className="space-y-5 border-t border-neutral-200 p-4 sm:p-5">
      <div><div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-neutral-900">1. Field đầu vào</h3><p className="mt-1 text-xs text-neutral-500">Thay đổi tên, kiểu dữ liệu và bắt buộc; preview bên dưới cập nhật tức thì.</p></div><button type="button" onClick={() => setDefinition(current => ({ ...current, fields: [...current.fields, { key: `field${current.fields.length + 1}`, label: 'Trường mới', type: 'text', sources: ['manual', 'excel'], validation: {} }] }))} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold"><Plus className="h-3.5 w-3.5" /> Thêm field</button></div>
      <div className="space-y-2">{definition.fields.map((field, index) => <div key={field.key + index} className="grid grid-cols-1 items-end gap-2 rounded-xl border border-neutral-200 p-3 sm:grid-cols-[minmax(0,1fr)_130px_100px_auto]">
        <label className="text-xs text-neutral-500">Tên field<input value={field.label} onChange={event => changeField(index, { label: event.target.value })} className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm text-neutral-900" /></label>
        <label className="text-xs text-neutral-500">Kiểu<select value={field.type} onChange={event => changeField(index, { type: event.target.value as WorkflowValueType })} className="mt-1 h-9 w-full rounded-lg border border-neutral-300 bg-white px-2 text-sm text-neutral-900">{types.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
        <label className="flex h-9 items-center gap-2 text-xs text-neutral-700"><input type="checkbox" checked={!!field.validation?.required} onChange={event => changeField(index, { validation: { ...field.validation, required: event.target.checked } })} /> Bắt buộc</label>
        <button type="button" aria-label={`Xóa ${field.label}`} onClick={() => setDefinition(current => ({ ...current, fields: current.fields.filter((_, i) => i !== index), mappings: current.mappings.filter(rule => rule.to !== field.key) }))} className="rounded-lg p-2 text-neutral-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
      </div>)}</div></div>
      <div><h3 className="text-sm font-semibold text-neutral-900">2. Dán dữ liệu Excel để xem mapping</h3><p className="mt-1 text-xs leading-5 text-neutral-500">Dòng đầu là tên cột. Mapping mẫu được tạo sẵn theo workflow; kết quả chuyển đổi sẽ hiển thị bên dưới.</p>
      <textarea value={input} onChange={event => setInput(event.target.value)} rows={4} placeholder="Mã thiết bị\tTên thiết bị\tNgày bảo trì\nEQ-001\tMáy bơm\t2026-10-09" className="mt-2 w-full rounded-xl border border-neutral-300 bg-neutral-50 p-3 font-mono text-xs text-neutral-900 focus:border-blue-500 focus:bg-white focus:outline-none" />
      {preview.length > 0 && <div className="overflow-x-auto rounded-xl border border-neutral-200"><table className="w-full min-w-[560px] text-left text-xs"><thead className="bg-neutral-50"><tr>{visibleFields.map(field => <th key={field.key} className="px-3 py-2 font-semibold text-neutral-600">{field.label}<span className="mt-0.5 block font-normal text-neutral-400">{field.key}</span></th>)}</tr></thead><tbody>{preview.map((row, index) => <tr key={index} className="border-t border-neutral-100">{visibleFields.map(field => <td key={field.key} className="px-3 py-2 text-neutral-800">{String(row[field.key] ?? '—')}</td>)}</tr>)}</tbody></table></div>}
      {input.trim() && !preview.length && <p className="mt-2 text-xs text-amber-700">Cần ít nhất một dòng tiêu đề và một dòng dữ liệu.</p>}</div>
      <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold text-neutral-900">3. Validation & output</h3><p className="mt-1 text-xs text-neutral-500">{issues.length ? `${issues.length} lỗi cần xử lý trước khi xuất.` : preview.length ? 'Dữ liệu xem trước hợp lệ.' : 'Dán dữ liệu để chạy kiểm tra.'}</p></div><div className="flex items-center gap-2"><select value={outputKind} onChange={event => setOutputKind(event.target.value)} className="h-9 rounded-lg border border-neutral-300 bg-white px-2 text-xs">{enabledOutputs.map(output => <option key={output.id} value={output.kind}>{output.label}</option>)}</select><button type="button" disabled={!preview.length || issues.length > 0 || outputKind !== 'csv'} onClick={() => downloadCsv(preview, visibleFields)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Download className="h-3.5 w-3.5" /> Xuất CSV</button></div></div>
      {issues.length > 0 && <ul className="space-y-1 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{issues.slice(0, 12).map((issue, index) => <li key={index}>Dòng {issue.row} · {issue.label}: {issue.message}</li>)}</ul>}
      {preview.length > 0 && issues.length === 0 && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{preview.length} dòng hợp lệ · có thể xuất CSV.</p>}
      {enabledOutputs.length === 0 && <p className="text-xs text-amber-700">Chưa bật đầu ra nào trong cấu hình.</p>}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4"><p className="text-xs text-neutral-500">{saved ? 'Đã lưu cấu hình trên trình duyệt này.' : 'Cấu hình lưu cục bộ trên trình duyệt này.'}</p><button type="button" onClick={save} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800">Lưu cấu hình</button></div>
    </div>}
  </section>;
};
