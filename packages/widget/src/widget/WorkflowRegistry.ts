import type { QrToolsWidgetConfig } from "./WidgetConfig";
import type { WorkflowCapabilities } from "./WorkflowCapabilities";
import { renderEquipmentMaintenance } from "../workflows/equipment-maintenance";

export interface ClientWorkflow {
  id: string;
  capabilities: WorkflowCapabilities;
  mount: (element: HTMLElement, config: QrToolsWidgetConfig) => void;
}

const registry: Record<string, ClientWorkflow> = {
  "equipment-maintenance": {
    id: "equipment-maintenance",
    capabilities: [
      "qr.generate",
      "qr.customize",
      "qr.download",
      "qr.print",
      "qr.scan.camera",
      "qr.scan.upload",
      "api.scan",
    ],
    mount: renderEquipmentMaintenance,
  },
};

export function getClientWorkflow(id: string): ClientWorkflow | undefined {
  return registry[id];
}
