import {
  RevocationAwareQrIdentityVerifier,
  getQrIdentityKey,
  qrIdentityEngine,
} from "../../qr-engine/src/index.ts";
import type { WorkflowDefinition, WorkflowRecord } from "../../types/src/index.ts";
import { DefaultScanRuntime } from "./scan.ts";
import { PersistenceWorkflowRegistry, PersistenceWorkflowResolver } from "./supabase-runtime.ts";

const definition: WorkflowDefinition = {
  id: "equipment-maintenance",
  version: 1,
  name: "Equipment Maintenance",
  inputFields: ["assetId", "assetName", "location", "maintenanceDate", "maintenanceNote"],
  mappings: [
    { source: "Asset ID", target: "assetId", required: true },
    { source: "Asset Name", target: "assetName", required: true },
    { source: "Location", target: "location", required: true },
    { source: "Maintenance Date", target: "maintenanceDate" },
    { source: "Maintenance Note", target: "maintenanceNote" },
  ],
};

const record: WorkflowRecord = {
  workflowId: "equipment-maintenance",
  workflowVersion: 1,
  recordId: "ASSET-001",
  data: {
    assetId: "ASSET-001",
    assetName: "Air Conditioner",
    location: "Meeting Room A",
    maintenanceDate: "2026-10-05",
    maintenanceNote: "Filter cleaned",
  },
};

const persistence = {
  records: {
    async get(workflowId: string, workflowVersion: number, recordId: string) {
      return workflowId === record.workflowId &&
        workflowVersion === record.workflowVersion &&
        recordId === record.recordId
        ? record
        : null;
    },
    async save(_value: WorkflowRecord) {},
    async delete(
      _workflowId: string,
      _workflowVersion: number,
      _recordId: string,
    ) {},
  },
  definitions: {
    async get(workflowId: string, version: number) {
      return workflowId === definition.id && version === definition.version
        ? definition
        : null;
    },
    async save(_value: WorkflowDefinition) {},
  },
};

const runtime = new DefaultScanRuntime(
  qrIdentityEngine,
  qrIdentityEngine,
  new PersistenceWorkflowResolver(persistence),
  new PersistenceWorkflowRegistry(persistence),
);

const payload = qrIdentityEngine.encode({
  version: 1,
  workflowId: record.workflowId,
  recordId: record.recordId,
});

const result = await runtime.scan(payload);

if (result.record?.data.assetName !== "Air Conditioner") {
  throw new Error("Expected equipment record.");
}

if (result.actions[0]?.type !== "view") {
  throw new Error("Expected view action.");
}

const missing = await runtime.scan(
  qrIdentityEngine.encode({
    version: 1,
    workflowId: record.workflowId,
    recordId: "ASSET-MISSING",
  }),
);

if (missing.record !== null || missing.actions.length !== 0) {
  throw new Error("Missing record should resolve without actions.");
}


const revokedKeys = new Set([getQrIdentityKey({
  version: 1,
  workflowId: record.workflowId,
  recordId: record.recordId,
})]);

const revokedRuntime = new DefaultScanRuntime(
  qrIdentityEngine,
  new RevocationAwareQrIdentityVerifier(qrIdentityEngine, {
    async isRevoked(identity) {
      return revokedKeys.has(getQrIdentityKey(identity));
    },
  }),
  new PersistenceWorkflowResolver(persistence),
  new PersistenceWorkflowRegistry(persistence),
);

try {
  await revokedRuntime.scan(payload);
  throw new Error("Revoked QR identity should be rejected.");
} catch (error) {
  if (!(error instanceof Error) || error.message !== "QR identity verification failed.") {
    throw error;
  }
}


try {
  qrIdentityEngine.encode({
    version: 2,
    workflowId: record.workflowId,
    recordId: record.recordId,
  });
  throw new Error("Unsupported QR protocol version should be rejected.");
} catch (error) {
  if (!(error instanceof Error) || error.message !== "Unsupported QR protocol version: 2.") {
    throw error;
  }
}


try {
  await (await import("../../qr-engine/src/index.ts")).qrIdentitySigner.sign({
    version: 1,
    workflowId: record.workflowId,
    recordId: record.recordId,
  });
  throw new Error("Infrastructure-owned signing should not be implemented by the core.");
} catch (error) {
  if (!(error instanceof Error) || error.message !== "QR identity signing is infrastructure-owned.") {
    throw error;
  }
}
