import type {
  FieldMapping,
  WorkflowDefinition,
  WorkflowRecord,
} from "../../types/src/index.ts";
import type {
  WorkflowDefinitionRepository,
  WorkflowRecordRepository,
} from "../../workflow-engine/src/persistence.ts";

export interface SupabaseRestClient {
  request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T>;
}

export interface SupabasePersistenceOptions {
  client: SupabaseRestClient;
  recordTable?: string;
  definitionTable?: string;
}

interface SupabaseRecordRow {
  workflow_id: string;
  workflow_version: number;
  record_id: string;
  data: Record<string, unknown>;
}

interface SupabaseDefinitionRow {
  id: string;
  version: number;
  name: string;
  input_fields: string[];
  mappings: FieldMapping[];
}

function encode(value: string): string {
  return encodeURIComponent(value);
}

function toRecord(row: SupabaseRecordRow): WorkflowRecord {
  return {
    workflowId: row.workflow_id,
    workflowVersion: row.workflow_version,
    recordId: row.record_id,
    data: row.data,
  };
}

function toDefinition(row: SupabaseDefinitionRow): WorkflowDefinition {
  return {
    id: row.id,
    version: row.version,
    name: row.name,
    inputFields: row.input_fields,
    mappings: row.mappings,
  };
}

export class SupabaseWorkflowRecordRepository
  implements WorkflowRecordRepository
{
  private readonly table: string;

  constructor(
    private readonly client: SupabaseRestClient,
    table = "workflow_records",
  ) {
    this.table = table;
  }

  async get(
    workflowId: string,
    workflowVersion: number,
    recordId: string,
  ): Promise<WorkflowRecord | null> {
    const rows = await this.client.request<SupabaseRecordRow[]>(
      `/${this.table}?workflow_id=eq.${encode(workflowId)}&workflow_version=eq.${workflowVersion}&record_id=eq.${encode(recordId)}&select=workflow_id,workflow_version,record_id,data&limit=1`,
    );

    return rows.length > 0 ? toRecord(rows[0]) : null;
  }

  async save(record: WorkflowRecord): Promise<void> {
    await this.client.request(
      `/${this.table}?on_conflict=workflow_id,workflow_version,record_id`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          workflow_id: record.workflowId,
          workflow_version: record.workflowVersion,
          record_id: record.recordId,
          data: record.data,
        }),
      },
    );
  }

  async delete(
    workflowId: string,
    workflowVersion: number,
    recordId: string,
  ): Promise<void> {
    await this.client.request(
      `/${this.table}?workflow_id=eq.${encode(workflowId)}&workflow_version=eq.${workflowVersion}&record_id=eq.${encode(recordId)}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } },
    );
  }
}

export class SupabaseWorkflowDefinitionRepository
  implements WorkflowDefinitionRepository
{
  private readonly table: string;

  constructor(
    private readonly client: SupabaseRestClient,
    table = "workflow_definitions",
  ) {
    this.table = table;
  }

  async get(
    workflowId: string,
    version: number,
  ): Promise<WorkflowDefinition | null> {
    const rows = await this.client.request<SupabaseDefinitionRow[]>(
      `/${this.table}?id=eq.${encode(workflowId)}&version=eq.${version}&select=id,version,name,input_fields,mappings&limit=1`,
    );

    return rows.length > 0 ? toDefinition(rows[0]) : null;
  }

  async save(definition: WorkflowDefinition): Promise<void> {
    await this.client.request(
      `/${this.table}?on_conflict=id,version`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          id: definition.id,
          version: definition.version,
          name: definition.name,
          input_fields: definition.inputFields,
          mappings: definition.mappings,
        }),
      },
    );
  }
}

export function createSupabaseWorkflowPersistence(
  options: SupabasePersistenceOptions,
) {
  const recordTable = options.recordTable ?? "workflow_records";
  const definitionTable =
    options.definitionTable ?? "workflow_definitions";

  return {
    records: new SupabaseWorkflowRecordRepository(
      options.client,
      recordTable,
    ),
    definitions: new SupabaseWorkflowDefinitionRepository(
      options.client,
      definitionTable,
    ),
  };
}
