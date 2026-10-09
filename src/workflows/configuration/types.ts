/** Shared contracts for schema-driven workflow input, mapping, validation and output. */
export type WorkflowValueType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'email'
  | 'url'
  | 'phone'
  | 'file'
  | 'qr';

export type WorkflowInputSource = 'manual' | 'excel' | 'qr' | 'default';

export interface WorkflowValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  allowedValues?: string[];
}

export interface WorkflowFieldOption {
  label: string;
  value: string;
}

export interface WorkflowFieldDefinition {
  /** Stable identifier used by mapping rules and output templates. */
  key: string;
  label: string;
  type: WorkflowValueType;
  description?: string;
  placeholder?: string;
  sources: WorkflowInputSource[];
  defaultValue?: unknown;
  validation?: WorkflowValidationRule;
  options?: WorkflowFieldOption[];
  /** Whether this field can be populated from a QR payload. */
  qrPath?: string;
}

export interface WorkflowMappingRule {
  source: WorkflowInputSource;
  /** Source column/path. Supports dot-separated object paths. */
  from: string;
  to: string;
  transform?: 'trim' | 'uppercase' | 'lowercase' | 'number' | 'date';
  fallback?: unknown;
}

export type WorkflowOutputKind = 'record' | 'qr' | 'csv' | 'excel' | 'print' | 'webhook';

export interface WorkflowOutputDefinition {
  id: string;
  label: string;
  kind: WorkflowOutputKind;
  enabled: boolean;
  /** Field keys included in this output. Empty means all fields. */
  fields?: string[];
  /** Optional template used by QR or display output. Supports {{fieldKey}} tokens. */
  template?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: number;
  fields: WorkflowFieldDefinition[];
  mappings: WorkflowMappingRule[];
  outputs: WorkflowOutputDefinition[];
}

export interface WorkflowValidationIssue {
  field: string;
  label: string;
  code: string;
  message: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  issues: WorkflowValidationIssue[];
}

export interface WorkflowRecord {
  [key: string]: unknown;
}
