import type { QrIdentity, QrIdentityVerifier } from "../../qr-engine/src/index.ts";
import type {
  RecordId,
  WorkflowDefinition,
  WorkflowId,
  WorkflowRecord,
} from "../../types/src/index.ts";

export interface WorkflowResolver {
  resolve(
    workflowId: WorkflowId,
    workflowVersion: number,
    recordId: RecordId,
  ): Promise<WorkflowRecord | null>;
}

export interface ScanAction {
  type: string;
  data?: Record<string, unknown>;
}

export interface ScanResult {
  identity: QrIdentity;
  record: WorkflowRecord | null;
  actions: ScanAction[];
}

export interface ScanRuntime {
  scan(payload: string): Promise<ScanResult>;
}

export interface WorkflowRegistry {
  get(workflowId: WorkflowId, version: number): Promise<WorkflowDefinition | null>;
}

export class DefaultScanRuntime implements ScanRuntime {
  constructor(
    private readonly qrDecoder: {
      decode(payload: string): QrIdentity;
    },
    private readonly qrVerifier: QrIdentityVerifier,
    private readonly resolver: WorkflowResolver,
    private readonly registry: WorkflowRegistry,
  ) {}

  async scan(payload: string): Promise<ScanResult> {
    const identity = this.qrDecoder.decode(payload);

    if (!(await this.qrVerifier.verify(identity))) {
      throw new Error("QR identity verification failed.");
    }

    const definition = await this.registry.get(
      identity.workflowId,
      identity.version,
    );

    if (!definition) {
      throw new Error("Workflow definition not found.");
    }

    const record = await this.resolver.resolve(
      identity.workflowId,
      identity.version,
      identity.recordId,
    );

    return {
      identity,
      record,
      actions: record
        ? [{ type: "view", data: { recordId: record.recordId } }]
        : [],
    };
  }
}
