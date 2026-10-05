import type {
  WorkflowImportResult,
  WorkflowImportService,
  WorkflowImportSource,
} from "../../../workflow-engine/src/index.ts";
import {
  createEquipmentMaintenanceRecord,
  EquipmentMaintenanceMapper,
  EquipmentMaintenanceValidator,
  equipmentMaintenanceWorkflow,
} from "./index.ts";
import {
  createExcelDataSource,
  createXlsxParser,
} from "../../../connectors/src/index.ts";

export function importEquipmentMaintenance(
  source: WorkflowImportSource,
  service: WorkflowImportService,
): Promise<WorkflowImportResult> {
  return service.import(
    source,
    equipmentMaintenanceWorkflow,
    new EquipmentMaintenanceMapper(),
    new EquipmentMaintenanceValidator(),
    createEquipmentMaintenanceRecord,
  );
}

export function createEquipmentMaintenanceXlsxSource(
  input: Uint8Array,
): WorkflowImportSource {
  return createExcelDataSource(input, createXlsxParser());
}
