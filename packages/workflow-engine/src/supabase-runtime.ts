import type { QrIdentity, QrIdentityVerifier } from "../../qr-engine/src/index.ts";
import type {
  WorkflowDefinition,
  WorkflowId,
  WorkflowRecord,
} from "../../types/src/index.ts";
import type { WorkflowPersistence } from "./persistence.ts";
import type { WorkflowResolver, WorkflowRegistry } from "./scan.ts";

export class PersistenceWorkflowResolver implements WorkflowResolver {
  constructor(private readonly persistence: WorkflowPersistence) {}

  resolve(
    workflowId: WorkflowId,
    workflowVersion: number,
    recordId: string,
  ): Promise<WorkflowRecord | null> {
    return this.persistence.records.get(
      workflowId,
      workflowVersion,
      recordId,
    );
  }
}

export class PersistenceWorkflowRegistry implements WorkflowRegistry {
  constructor(private readonly persistence: WorkflowPersistence) {}

  get(
    workflowId: WorkflowId,
    version: number,
  ): Promise<WorkflowDefinition | null> {
    return this.persistence.definitions.get(workflowId, version);
  }
}

export interface ScanRuntimeDependencies {
  persistence: WorkflowPersistence;
  qrDecoder: { decode(payload: string): QrIdentity };
  qrVerifier: QrIdentityVerifier;
}

export function createPersistenceScanDependencies(
  dependencies: ScanRuntimeDependencies,
) {
  return {
    resolver: new PersistenceWorkflowResolver(dependencies.persistence),
    registry: new PersistenceWorkflowRegistry(dependencies.persistence),
  };
}
