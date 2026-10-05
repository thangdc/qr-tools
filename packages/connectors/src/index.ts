import type { WorkflowRecord } from "../../types/src/index.ts";

export interface InputConnector {
  readonly type: string;
  read(input: ConnectorInput): Promise<WorkflowRecord[]>;
}

export interface OutputConnector {
  readonly type: string;
  write(
    records: WorkflowRecord[],
    options?: Record<string, unknown>,
  ): Promise<ConnectorResult>;
}

export interface ConnectorInput {
  config: Record<string, unknown>;
}

export interface ConnectorResult {
  success: boolean;
  metadata?: Record<string, unknown>;
}

export interface ConnectorRegistry {
  getInput(type: string): InputConnector | undefined;
  getOutput(type: string): OutputConnector | undefined;
}

export {
  createSupabaseWorkflowPersistence,
  SupabaseWorkflowDefinitionRepository,
  SupabaseWorkflowRecordRepository,
} from "./supabase-workflow-persistence.ts";

export type {
  SupabasePersistenceOptions,
  SupabaseRestClient,
} from "./supabase-workflow-persistence.ts";

export {
  createCsvDataSource,
  createExcelDataSource,
  ParsedTabularDataSource,
} from "./tabular.ts";

export type {
  CsvParser,
  ExcelParser,
  TabularDataSource,
  TabularParser,
  TabularRow,
  TabularConnectorOptions,
} from "./tabular.ts";

export {
  createXlsxParser,
  XlsxParser,
} from "./xlsx.ts";
