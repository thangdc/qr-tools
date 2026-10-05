import type {
  RecordId,
  WorkflowDefinition,
  WorkflowId,
  WorkflowRecord,
} from "../../types/src/index.ts";

export interface WorkflowRecordRepository {
  get(
    workflowId: WorkflowId,
    workflowVersion: number,
    recordId: RecordId,
  ): Promise<WorkflowRecord | null>;

  save(record: WorkflowRecord): Promise<void>;

  delete(
    workflowId: WorkflowId,
    workflowVersion: number,
    recordId: RecordId,
  ): Promise<void>;
}

export interface WorkflowDefinitionRepository {
  get(
    workflowId: WorkflowId,
    version: number,
  ): Promise<WorkflowDefinition | null>;

  save(definition: WorkflowDefinition): Promise<void>;
}

export interface WorkflowPersistence {
  records: WorkflowRecordRepository;
  definitions: WorkflowDefinitionRepository;
}
