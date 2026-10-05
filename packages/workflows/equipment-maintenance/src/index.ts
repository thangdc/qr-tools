import type {
  ValidationResult,
  WorkflowDefinition,
  WorkflowRecord,
} from "../../../types/src/index.ts";
import type {
  WorkflowMapper,
  WorkflowValidator,
} from "../../../workflow-engine/src/index.ts";

export interface EquipmentMaintenanceData {
  assetId: string;
  assetName: string;
  location: string;
  maintenanceDate?: string;
  maintenanceNote?: string;
}

export const equipmentMaintenanceWorkflow: WorkflowDefinition = {
  id: "equipment-maintenance",
  version: 1,
  name: "Equipment Maintenance",
  inputFields: [
    "assetId",
    "assetName",
    "location",
    "maintenanceDate",
    "maintenanceNote",
  ],
  mappings: [
    { source: "Asset ID", target: "assetId", required: true },
    { source: "Asset Name", target: "assetName", required: true },
    { source: "Location", target: "location", required: true },
    { source: "Maintenance Date", target: "maintenanceDate" },
    { source: "Maintenance Note", target: "maintenanceNote" },
  ],
};

export class EquipmentMaintenanceValidator implements WorkflowValidator {
  validate(record: WorkflowRecord): ValidationResult {
    const data = record.data as Partial<EquipmentMaintenanceData>;
    const issues = [];

    for (const field of ["assetId", "assetName", "location"] as const) {
      if (!data[field] || typeof data[field] !== "string") {
        issues.push({
          field,
          code: "required",
          message: `${field} is required.`,
        });
      }
    }

    if (data.maintenanceDate !== undefined) {
      const parsed = Date.parse(data.maintenanceDate);
      if (Number.isNaN(parsed)) {
        issues.push({
          field: "maintenanceDate",
          code: "invalid_date",
          message: "maintenanceDate must be a valid date.",
        });
      }
    }

    return { valid: issues.length === 0, issues };
  }
}

export class EquipmentMaintenanceMapper
  implements WorkflowMapper<EquipmentMaintenanceData> {
  map(source: Record<string, unknown>): EquipmentMaintenanceData {
    return {
      assetId: source["Asset ID"] as string,
      assetName: source["Asset Name"] as string,
      location: source.Location as string,
      maintenanceDate:
        (source["Maintenance Date"] ?? source.maintenanceDate) as
          | string
          | undefined,
      maintenanceNote:
        (source["Maintenance Note"] ?? source.maintenanceNote) as
          | string
          | undefined,
    };
  }
}

export function createEquipmentMaintenanceRecord(
  data: EquipmentMaintenanceData,
): WorkflowRecord {
  return {
    workflowId: equipmentMaintenanceWorkflow.id,
    workflowVersion: equipmentMaintenanceWorkflow.version,
    recordId: data.assetId,
    data: { ...data },
  };
}
