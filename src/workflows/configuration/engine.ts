import type {
  WorkflowDefinition,
  WorkflowFieldDefinition,
  WorkflowInputSource,
  WorkflowMappingRule,
  WorkflowOutputDefinition,
  WorkflowRecord,
  WorkflowValidationIssue,
  WorkflowValidationResult,
} from './types';

function getPath(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

function applyTransform(value: unknown, transform: WorkflowMappingRule['transform']): unknown {
  if (value === null || value === undefined) return value;
  switch (transform) {
    case 'trim': return typeof value === 'string' ? value.trim() : value;
    case 'uppercase': return typeof value === 'string' ? value.toUpperCase() : value;
    case 'lowercase': return typeof value === 'string' ? value.toLowerCase() : value;
    case 'number': {
      if (value === '') return undefined;
      const parsed = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }
    case 'date': {
      if (value instanceof Date) return Number.isNaN(value.getTime()) ? value : value.toISOString().slice(0, 10);
      if (typeof value !== 'string' && typeof value !== 'number') return value;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 10);
    }
    default: return value;
  }
}

function normalizeType(value: unknown, field: WorkflowFieldDefinition): unknown {
  if (value === undefined || value === null || value === '') return value;
  switch (field.type) {
    case 'number': {
      const numberValue = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(numberValue) ? numberValue : value;
    }
    case 'checkbox':
      if (typeof value === 'boolean') return value;
      if (value === 1 || value === '1' || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'yes') return true;
      if (value === 0 || value === '0' || String(value).toLowerCase() === 'false' || String(value).toLowerCase() === 'no') return false;
      return value;
    case 'text':
    case 'email':
    case 'url':
    case 'phone':
    case 'select':
    case 'date':
    case 'qr':
      return String(value);
    case 'file':
      return value;
  }
}

export function mapWorkflowInput(
  definition: WorkflowDefinition,
  source: WorkflowInputSource,
  input: WorkflowRecord,
  initial: WorkflowRecord = {},
): WorkflowRecord {
  const result: WorkflowRecord = { ...initial };

  for (const field of definition.fields) {
    if (result[field.key] === undefined && field.defaultValue !== undefined) {
      result[field.key] = field.defaultValue;
    }
  }

  for (const rule of definition.mappings) {
    if (rule.source !== source) continue;
    const field = definition.fields.find(item => item.key === rule.to);
    if (!field || !field.sources.includes(source)) continue;
    const raw = getPath(input, rule.from);
    const candidate = raw === undefined || raw === null || raw === '' ? rule.fallback : raw;
    if (candidate !== undefined) result[rule.to] = normalizeType(applyTransform(candidate, rule.transform), field);
  }

  // Direct field-name mapping is a safe default for configured sources when no explicit rule exists.
  for (const field of definition.fields) {
    if (!field.sources.includes(source)) continue;
    const hasExplicitRule = definition.mappings.some(rule => rule.source === source && rule.to === field.key);
    if (!hasExplicitRule && result[field.key] === undefined && input[field.key] !== undefined) {
      result[field.key] = normalizeType(input[field.key], field);
    }
  }
  return result;
}

export function validateWorkflowRecord(
  definition: WorkflowDefinition,
  record: WorkflowRecord,
): WorkflowValidationResult {
  const issues: WorkflowValidationIssue[] = [];

  for (const field of definition.fields) {
    const value = record[field.key];
    const rules = field.validation ?? {};
    const missing = value === undefined || value === null || value === '';
    const add = (code: string, message: string) => issues.push({ field: field.key, label: field.label, code, message });

    if (rules.required && (missing || (field.type === 'checkbox' && value !== true))) {
      add('required', `${field.label} is required.`);
      continue;
    }
    if (missing) continue;

    if (field.type === 'number') {
      const numberValue = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(numberValue)) {
        add('type', `${field.label} must be a valid number.`);
        continue;
      }
      if (rules.min !== undefined && numberValue < rules.min) add('min', `${field.label} must be at least ${rules.min}.`);
      if (rules.max !== undefined && numberValue > rules.max) add('max', `${field.label} must be no more than ${rules.max}.`);
    }

    if (typeof value === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) add('minLength', `${field.label} must contain at least ${rules.minLength} characters.`);
      if (rules.maxLength !== undefined && value.length > rules.maxLength) add('maxLength', `${field.label} must contain no more than ${rules.maxLength} characters.`);
      if (rules.pattern) {
        try {
          if (!new RegExp(rules.pattern).test(value)) add('pattern', rules.patternMessage ?? `${field.label} has an invalid format.`);
        } catch {
          add('configuration', `Validation pattern for ${field.label} is invalid.`);
        }
      }
      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) add('email', `${field.label} must be a valid email address.`);
      if (field.type === 'url') {
        try { new URL(value); } catch { add('url', `${field.label} must be a valid URL.`); }
      }
    }

    if (field.type === 'select' && field.options?.length && !field.options.some(option => option.value === String(value))) {
      add('option', `${field.label} must be one of the configured options.`);
    }
    if (rules.allowedValues && !rules.allowedValues.includes(String(value))) {
      add('allowedValues', `${field.label} contains an unsupported value.`);
    }
  }

  return { valid: issues.length === 0, issues };
}

export function renderWorkflowTemplate(template: string, record: WorkflowRecord): string {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key: string) => {
    const value = getPath(record, key);
    return value === undefined || value === null ? '' : String(value);
  });
}

export function buildWorkflowOutput(
  definition: WorkflowDefinition,
  output: WorkflowOutputDefinition,
  record: WorkflowRecord,
): { kind: WorkflowOutputDefinition['kind']; label: string; data: unknown } {
  const keys = output.fields?.length ? output.fields : definition.fields.map(field => field.key);
  const data: WorkflowRecord = Object.fromEntries(keys.map(key => [key, record[key]]));
  if (output.kind === 'qr') {
    const template = output.template ?? keys.map(key => `${key}: {{${key}}}`).join('\n');
    return { kind: output.kind, label: output.label, data: renderWorkflowTemplate(template, data) };
  }
  if (output.kind === 'csv' || output.kind === 'excel') {
    const escapeCell = (value: unknown) => {
      const text = value === undefined || value === null ? '' : String(value);
      // Prevent spreadsheet formula injection for untrusted imported values.
      const safe = /^[=+@\-]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const headers = keys.map(key => definition.fields.find(field => field.key === key)?.label ?? key);
    const row = keys.map(key => data[key]);
    return { kind: output.kind, label: output.label, data: [headers, row].map(line => line.map(escapeCell).join(',')).join('\r\n') };
  }
  return { kind: output.kind, label: output.label, data };
}

export function getEnabledWorkflowOutputs(definition: WorkflowDefinition): WorkflowOutputDefinition[] {
  return definition.outputs.filter(output => output.enabled);
}
