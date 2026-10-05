/** Shared contracts between QR Tools application boundaries. */
export type WorkflowId = string;
export type WorkflowVersion = number;
export type RecordId = string;

export interface WorkflowRecord {
  workflowId: WorkflowId;
  workflowVersion: WorkflowVersion;
  recordId: RecordId;
  data: Record<string, unknown>;
}

export interface ValidationIssue {
  field: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface FieldMapping {
  source: string;
  target: string;
  required?: boolean;
}

export interface WorkflowDefinition {
  id: WorkflowId;
  version: WorkflowVersion;
  name: string;
  inputFields: string[];
  mappings: FieldMapping[];
}

export interface WorkflowContext {
  definition: WorkflowDefinition;
  record: WorkflowRecord;
}
