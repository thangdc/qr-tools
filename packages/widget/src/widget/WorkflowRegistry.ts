import type { QrToolsWidgetConfig } from "./WidgetConfig";
import { renderEquipmentMaintenance } from "../workflows/equipment-maintenance";

export interface ClientWorkflow {
  id: string;
  mount: (element: HTMLElement, config: QrToolsWidgetConfig) => void;
}

const registry: Record<string, ClientWorkflow> = {
  "equipment-maintenance": {
    id: "equipment-maintenance",
    mount: renderEquipmentMaintenance,
  },
};

export function getClientWorkflow(id: string): ClientWorkflow | undefined {
  return registry[id];
}
