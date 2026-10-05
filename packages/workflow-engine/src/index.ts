import type {
  ValidationResult,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowRecord,
} from "../../types/src/index.ts";

export interface WorkflowValidator {
  validate(record: WorkflowRecord, definition: WorkflowDefinition): ValidationResult;
}

export interface WorkflowMapper<TOutput = Record<string, unknown>> {
  map(
    source: Record<string, unknown>,
    definition: WorkflowDefinition,
  ): TOutput;
}

export interface WorkflowExecutor {
  execute(context: WorkflowContext): Promise<WorkflowExecutionResult>;
}

export interface WorkflowExecutionResult {
  record: WorkflowRecord;
  outputs: WorkflowOutput[];
}

export interface WorkflowOutput {
  type: string;
  data: Record<string, unknown>;
}

export interface WorkflowEngine {
  validate(
    record: WorkflowRecord,
    definition: WorkflowDefinition,
  ): ValidationResult;

  map(
    source: Record<string, unknown>,
    definition: WorkflowDefinition,
  ): Record<string, unknown>;

  execute(context: WorkflowContext): Promise<WorkflowExecutionResult>;
}

export {
  WorkflowImportService,
} from "./import-pipeline.ts";

export type {
  WorkflowImportMapper,
  WorkflowImportResult,
  WorkflowImportServiceOptions,
  WorkflowImportSource,
  WorkflowImportValidator,
} from "./import-pipeline.ts";
