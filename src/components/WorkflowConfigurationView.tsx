import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Settings2 } from 'lucide-react';
import type { WorkflowDefinition, WorkflowFieldDefinition, WorkflowInputSource, WorkflowOutputDefinition, WorkflowValueType } from '../workflows/configuration';

const STORAGE_KEY = 'qr_tools_workflow_definitions_v1';
const SOURCES: WorkflowInputSource[] = ['manual', 'excel', 'qr', 'default'];
const FIELD_TYPES: WorkflowValueType[] = ['text', 'number', 'date', 'select', 'checkbox', 'email', 'url', 'phone', 'file', 'qr'];

const createDefinition = (id: string, name: string): WorkflowDefinition => ({
  id, name, version: 1,
  fields: [
    { key: 'recordCode', label: 'Mã bản ghi', type: 'text', sources: ['manual', 'excel', 'qr'], validation: { required: true, maxLength: 100 } },
    { key: 'description', label: 'Mô tả', type: 'text', sources: ['manual', 'excel', 'qr'], validation: { maxLength: 500 } },
  ],
  mappings: [],
  outputs: [
    { id: 'record', label: 'Xem kết quả', kind: 'record', enabled: true },
    { id: 'qr', label: 'Tạo mã QR', kind: 'qr', enabled: true, template: '{{recordCode}}' },
    { id: 'csv', label: 'Xuất CSV', kind: 'csv', enabled: true },
    { id: 'print', label: 'In', kind: 'print', enabled: true },
  ],
});

const DEFAULT_DEFINITIONS = [
  createDefinition('checkin', 'Điểm danh / Check-in'),
  createDefinition('bulk-print', 'Tạo QR hàng loạt & In'),
  createDefinition('assets', 'Quản lý tài sản'),
  createDefinition('inventory', 'Kiểm kê hàng hóa'),
  createDefinition('rooms', 'Quản lý phòng / căn hộ'),
  createDefinition('payment', 'Thu tiền / Thanh toán'),
  createDefinition('equipment-maintenance', 'Bảo trì thiết bị'),
];

const loadDefinitions = (): WorkflowDefinition[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed as WorkflowDefinition[];
    }
  } catch { /* use defaults when saved settings are unavailable */ }
  return DEFAULT_DEFINITIONS;
};

interface WorkflowConfigurationViewProps {
  onBack?: () => void;
  initialWorkflowId?: string;
  isModal?: boolean;
  onClose?: () => void;
}

export const WorkflowConfigurationView: React.FC<WorkflowConfigurationViewProps> = ({ onBack, initialWorkflowId, isModal = false, onClose }) => {
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>(loadDefinitions);
  const [selectedId, setSelectedId] = useState(initialWorkflowId ?? definitions[0]?.id ?? 'checkin');
  const [saved, setSaved] = useState(false);
  const current = useMemo(() => definitions.find(item => item.id === selectedId) ?? definitions[0], [definitions, selectedId]);

  useEffect(() => {
    setSaved(false);
  }, [definitions]);

  useEffect(() => {
    if (initialWorkflowId) setSelectedId(initialWorkflowId);
  }, [initialWorkflowId]);

  const updateCurrent = (update: (definition: WorkflowDefinition) => WorkflowDefinition) => {
    setDefinitions(previous => previous.map(definition => definition.id === selectedId ? update(definition) : definition));
  };

  const updateField = (index: number, patch: Partial<WorkflowFieldDefinition>) => {
    updateCurrent(definition => ({
      ...definition,
      fields: definition.fields.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...patch } : field),
    }));
  };

  const addField = () => {
    const key = `field${(current?.fields.length ?? 0) + 1}`;
    updateCurrent(definition => ({
      ...definition,
      fields: [...definition.fields, { key, label: 'Trường mới', type: 'text', sources: ['manual'], validation: {} }],
    }));
  };

  const removeField = (index: number) => updateCurrent(definition => ({
    ...definition,
    fields: definition.fields.filter((_, fieldIndex) => fieldIndex !== index),
    mappings: definition.mappings.filter(rule => rule.to !== definition.fields[index]?.key),
    outputs: definition.outputs.map(output => ({ ...output, fields: output.fields?.filter(key => key !== definition.fields[index]?.key) })),
  }));

  const addMapping = () => updateCurrent(definition => ({
    ...definition,
    mappings: [...definition.mappings, { source: 'excel', from: '', to: definition.fields[0]?.key ?? '', transform: 'trim' }],
  }));

  const addOutput = () => updateCurrent(definition => ({
    ...definition,
    outputs: [...definition.outputs, { id: `output-${Date.now()}`, label: 'Output mới', kind: 'record', enabled: true }],
  }));

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(definitions));
      setSaved(true);
    } catch {
      window.alert('Không thể lưu cấu hình trên trình duyệt này.');
    }
  };

  if (!current) return null;

  return (
    <div className={isModal ? "fixed inset-0 z-50 overflow-y-auto bg-neutral-950/50 p-3 sm:p-6" : "mx-auto w-full max-w-5xl"} role={isModal ? "dialog" : undefined} aria-modal={isModal ? true : undefined} aria-label={isModal ? "Cấu hình workflow" : undefined}><div className={isModal ? "mx-auto my-2 w-full max-w-5xl space-y-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-2xl sm:my-6 sm:p-6" : "w-full space-y-6"}>
      <div className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 bg-neutral-50/95 pb-4 pt-1 backdrop-blur-sm">
        <div>
          {isModal ? <button type="button" onClick={onClose} aria-label="Đóng cấu hình" className="mb-3 inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-600 hover:bg-neutral-100"><ArrowLeft className="h-4 w-4" /> Đóng</button> : <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" /> Quay lại Workflows</button>}
          <div className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-blue-700" /><h1 className="text-2xl font-bold text-neutral-900">Cấu hình dữ liệu workflow</h1></div>
          <p className="mt-1 text-sm text-neutral-500">Định nghĩa input, mapping, validation và các đầu ra cho từng quy trình.</p>
        </div>
        <button type="button" onClick={save} className="inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white hover:bg-black"><Save className="h-4 w-4" /> Lưu cấu hình</button>
      </div>

      {saved && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Đã lưu cấu hình trên trình duyệt này.</p>}

      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <label className="mb-2 block text-sm font-semibold text-neutral-800">Workflow</label>
        <select value={selectedId} onChange={event => setSelectedId(event.target.value)} disabled={isModal} className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500 md:max-w-xl">
          {definitions.map(definition => <option key={definition.id} value={definition.id}>{definition.name}</option>)}
        </select>
        <p className="mt-2 text-xs text-neutral-500">Phiên bản cấu hình: {current.version}. Cấu hình hiện được lưu cục bộ trong trình duyệt, chưa đồng bộ giữa thiết bị hoặc người dùng.</p>
      </section>

      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-neutral-900">1. Dữ liệu đầu vào</h2><p className="text-xs text-neutral-500">Chọn kiểu dữ liệu, nguồn được phép và quy tắc kiểm tra.</p></div><button type="button" onClick={addField} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold"><Plus className="h-3.5 w-3.5" /> Thêm field</button></div>
        {current.fields.map((field, index) => <div key={field.key + index} className="grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 p-3 md:grid-cols-12">
          <label className="md:col-span-3"><span className="mb-1 block text-xs text-neutral-500">Tên hiển thị</span><input value={field.label} onChange={event => updateField(index, { label: event.target.value })} className="h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm" /></label>
          <label className="md:col-span-2"><span className="mb-1 block text-xs text-neutral-500">Field key</span><input value={field.key} onChange={event => updateField(index, { key: event.target.value.replace(/[^a-zA-Z0-9_.-]/g, '') })} className="h-9 w-full rounded-lg border border-neutral-300 px-2 font-mono text-xs" /></label>
          <label className="md:col-span-2"><span className="mb-1 block text-xs text-neutral-500">Kiểu dữ liệu</span><select value={field.type} onChange={event => updateField(index, { type: event.target.value as WorkflowValueType })} className="h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm">{FIELD_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
          <label className="flex items-center gap-2 pt-4 text-xs text-neutral-700 md:col-span-2"><input type="checkbox" checked={!!field.validation?.required} onChange={event => updateField(index, { validation: { ...field.validation, required: event.target.checked } })} /> Bắt buộc</label>
          <label className="md:col-span-2"><span className="mb-1 block text-xs text-neutral-500">Nguồn dữ liệu</span><select multiple value={field.sources} onChange={event => updateField(index, { sources: Array.from(event.target.selectedOptions).map(option => option.value as WorkflowInputSource) })} className="h-20 w-full rounded-lg border border-neutral-300 px-2 text-xs">{SOURCES.map(source => <option key={source} value={source}>{source}</option>)}</select></label>
          <div className="flex items-start justify-end md:col-span-1"><button type="button" aria-label={`Xóa ${field.label}`} onClick={() => removeField(index)} className="rounded-lg p-2 text-neutral-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></div>
          <label className="md:col-span-3"><span className="mb-1 block text-xs text-neutral-500">Giá trị mặc định</span><input value={field.defaultValue === undefined ? '' : String(field.defaultValue)} onChange={event => updateField(index, { defaultValue: event.target.value || undefined })} className="h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm" /></label>
          <label className="md:col-span-3"><span className="mb-1 block text-xs text-neutral-500">Độ dài tối thiểu</span><input type="number" min="0" value={field.validation?.minLength ?? ''} onChange={event => updateField(index, { validation: { ...field.validation, minLength: event.target.value === '' ? undefined : Number(event.target.value) } })} className="h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm" /></label>
          <label className="md:col-span-3"><span className="mb-1 block text-xs text-neutral-500">Độ dài tối đa</span><input type="number" min="0" value={field.validation?.maxLength ?? ''} onChange={event => updateField(index, { validation: { ...field.validation, maxLength: event.target.value === '' ? undefined : Number(event.target.value) } })} className="h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm" /></label>
          <label className="md:col-span-3"><span className="mb-1 block text-xs text-neutral-500">Regex (tuỳ chọn)</span><input value={field.validation?.pattern ?? ''} onChange={event => updateField(index, { validation: { ...field.validation, pattern: event.target.value || undefined } })} className="h-9 w-full rounded-lg border border-neutral-300 px-2 font-mono text-xs" /></label>
        </div>)}
      </section>

      <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-neutral-900">2. Mapping dữ liệu</h2><p className="text-xs text-neutral-500">Ánh xạ cột/path từ Excel, QR hoặc nguồn khác sang field đích.</p></div><button type="button" onClick={addMapping} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold"><Plus className="h-3.5 w-3.5" /> Thêm mapping</button></div>
        {current.mappings.length === 0 && <p className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-500">Chưa có mapping riêng. Có thể thêm quy tắc khi tên cột nguồn khác field key.</p>}
        {current.mappings.map((mapping, index) => <div key={index} className="grid grid-cols-1 items-end gap-2 rounded-xl border border-neutral-200 p-3 md:grid-cols-12">
          <label className="md:col-span-2"><span className="mb-1 block text-xs text-neutral-500">Nguồn</span><select value={mapping.source} onChange={event => updateCurrent(definition => ({ ...definition, mappings: definition.mappings.map((item, i) => i === index ? { ...item, source: event.target.value as WorkflowInputSource } : item) }))} className="h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm">{SOURCES.map(source => <option key={source}>{source}</option>)}</select></label>
          <label className="md:col-span-3"><span className="mb-1 block text-xs text-neutral-500">Cột/path nguồn</span><input value={mapping.from} onChange={event => updateCurrent(definition => ({ ...definition, mappings: definition.mappings.map((item, i) => i === index ? { ...item, from: event.target.value } : item) }))} placeholder="Asset ID" className="h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm" /></label>
          <label className="md:col-span-3"><span className="mb-1 block text-xs text-neutral-500">Field đích</span><select value={mapping.to} onChange={event => updateCurrent(definition => ({ ...definition, mappings: definition.mappings.map((item, i) => i === index ? { ...item, to: event.target.value } : item) }))} className="h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm">{current.fields.map(field => <option key={field.key} value={field.key}>{field.label} ({field.key})</option>)}</select></label>
          <label className="md:col-span-3"><span className="mb-1 block text-xs text-neutral-500">Chuyển đổi</span><select value={mapping.transform ?? ''} onChange={event => updateCurrent(definition => ({ ...definition, mappings: definition.mappings.map((item, i) => i === index ? { ...item, transform: (event.target.value || undefined) as typeof item.transform } : item) }))} className="h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm"><option value="">Không</option><option value="trim">Trim</option><option value="uppercase">UPPERCASE</option><option value="lowercase">lowercase</option><option value="number">Number</option><option value="date">Date</option></select></label>
          <button type="button" aria-label="Xóa mapping" onClick={() => updateCurrent(definition => ({ ...definition, mappings: definition.mappings.filter((_, i) => i !== index) }))} className="mb-1 rounded-lg p-2 text-neutral-500 hover:bg-red-50 hover:text-red-700 md:col-span-1"><Trash2 className="h-4 w-4" /></button>
        </div>)}
      </section>

      <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-neutral-900">3. Dữ liệu đầu ra</h2><p className="text-xs text-neutral-500">Chọn các output mà workflow sẽ hỗ trợ.</p></div><button type="button" onClick={addOutput} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold"><Plus className="h-3.5 w-3.5" /> Thêm output</button></div>
        {current.outputs.map((output, index) => <div key={output.id} className="grid grid-cols-1 items-center gap-3 rounded-xl border border-neutral-200 p-3 md:grid-cols-12">
          <label className="flex items-center gap-2 text-sm md:col-span-1"><input type="checkbox" checked={output.enabled} onChange={event => updateCurrent(definition => ({ ...definition, outputs: definition.outputs.map((item, i) => i === index ? { ...item, enabled: event.target.checked } : item) }))} /> Bật</label>
          <label className="md:col-span-4"><span className="mb-1 block text-xs text-neutral-500">Tên output</span><input value={output.label} onChange={event => updateCurrent(definition => ({ ...definition, outputs: definition.outputs.map((item, i) => i === index ? { ...item, label: event.target.value } : item) }))} className="h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm" /></label>
          <label className="md:col-span-3"><span className="mb-1 block text-xs text-neutral-500">Kiểu output</span><select value={output.kind} onChange={event => updateCurrent(definition => ({ ...definition, outputs: definition.outputs.map((item, i) => i === index ? { ...item, kind: event.target.value as WorkflowOutputDefinition['kind'] } : item) }))} className="h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm">{(['record', 'qr', 'csv', 'excel', 'print', 'webhook'] as const).map(kind => <option key={kind} value={kind}>{kind}</option>)}</select></label>
          <label className="md:col-span-3"><span className="mb-1 block text-xs text-neutral-500">Template (QR/record)</span><input value={output.template ?? ''} onChange={event => updateCurrent(definition => ({ ...definition, outputs: definition.outputs.map((item, i) => i === index ? { ...item, template: event.target.value || undefined } : item) }))} placeholder="{{recordCode}}" className="h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm" /></label>
          <button type="button" aria-label="Xóa output" onClick={() => updateCurrent(definition => ({ ...definition, outputs: definition.outputs.filter((_, i) => i !== index) }))} className="rounded-lg p-2 text-neutral-500 hover:bg-red-50 hover:text-red-700 md:col-span-1"><Trash2 className="h-4 w-4" /></button>
        </div>)}
      </section>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Trạng thái triển khai:</strong> Đây là giao diện biên tập và lưu schema ở local browser. Cần bước tích hợp tiếp theo để từng workflow thực thi cấu hình này; Excel import vẫn phải giữ riêng và miễn phí, còn quyền Pro cho scan/print được giữ theo logic hiện hành.</div>
    </div></div>
  );
};
