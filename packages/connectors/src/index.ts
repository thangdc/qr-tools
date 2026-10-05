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
