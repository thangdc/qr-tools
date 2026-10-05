import { qrIdentityEngine } from "../../qr-engine/src/index.ts";
import type { WorkflowDefinition, WorkflowRecord } from "../../types/src/index.ts";
import { DefaultScanRuntime } from "./scan.ts";
import { PersistenceWorkflowRegistry, PersistenceWorkflowResolver } from "./supabase-runtime.ts";

interface TestPersistence {
  records: { get(workflowId: string, workflowVersion: number, recordId: string): Promise<WorkflowRecord | null> };
  definitions: { get(workflowId: string, version: number): Promise<WorkflowDefinition | null> };
}

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

const persistence: TestPersistence = {
  records: {
    async get(workflowId, workflowVersion, recordId) {
      return workflowId === record.workflowId && workflowVersion === record.workflowVersion && recordId === record.recordId
        ? record
        : null;
    },
  },
  definitions: {
    async get(workflowId, version) {
      return workflowId === definition.id && version === definition.version ? definition : null;
    },
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

if (result.record?.data.assetName !== "Air Conditioner") throw new Error("Expected equipment record.");
if (result.actions[0]?.type !== "view") throw new Error("Expected view action.");

const missing = await runtime.scan(qrIdentityEngine.encode({
  version: 1,
  workflowId: record.workflowId,
  recordId: "ASSET-MISSING",
}));

if (missing.record !== null || missing.actions.length !== 0) {
  throw new Error("Missing record should resolve without actions.");
}
