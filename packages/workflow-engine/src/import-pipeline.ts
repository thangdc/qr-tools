import type { QrPayloadEncoder } from "../../qr-engine/src/index.ts";
import type {
  WorkflowDefinition,
  WorkflowRecord,
} from "../../types/src/index.ts";
import type { WorkflowPersistence } from "./persistence.ts";

export interface WorkflowImportSource {
  load(): Promise<Record<string, unknown>[]>;
}

export interface WorkflowImportMapper {
  map(
    source: Record<string, unknown>,
    definition: WorkflowDefinition,
  ): Record<string, unknown>;
}

export interface WorkflowImportValidator {
  validate(
    record: WorkflowRecord,
    definition: WorkflowDefinition,
  ): {
    valid: boolean;
    issues: Array<{
      field: string;
      code: string;
      message: string;
    }>;
  };
}

export interface WorkflowImportResult {
  records: WorkflowRecord[];
  qrPayloads: string[];
}

export interface WorkflowImportServiceOptions {
  persistence: WorkflowPersistence;
  qrEncoder: QrPayloadEncoder;
}

export class WorkflowImportService {
  constructor(private readonly options: WorkflowImportServiceOptions) {}

  async import(
    source: WorkflowImportSource,
    definition: WorkflowDefinition,
    mapper: WorkflowImportMapper,
    validator: WorkflowImportValidator,
    createRecord: (
      data: Record<string, unknown>,
    ) => WorkflowRecord,
  ): Promise<WorkflowImportResult> {
    const rows = await source.load();
    const records: WorkflowRecord[] = [];
    const qrPayloads: string[] = [];

    for (const row of rows) {
      const mapped = mapper.map(row, definition);
      const record = createRecord(mapped);
      const validation = validator.validate(record, definition);

      if (!validation.valid) {
        const details = validation.issues
          .map((issue) => `${issue.field}: ${issue.message}`)
          .join("; ");

        throw new Error(`Workflow import validation failed: ${details}`);
      }

      await this.options.persistence.records.save(record);

      records.push(record);
      qrPayloads.push(
        this.options.qrEncoder.encode({
          version: record.workflowVersion,
          workflowId: record.workflowId,
          recordId: record.recordId,
        }),
      );
    }

    return { records, qrPayloads };
  }
}
