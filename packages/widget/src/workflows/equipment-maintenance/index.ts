import "../../../../../../src/index.css";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { LanguageProvider } from "../../../../../src/i18n";
import { EquipmentMaintenanceWorkflow } from "../../../../../src/components/EquipmentMaintenanceWorkflow";
import type { QrToolsWidgetConfig } from "../../widget/WidgetConfig";
import type { WorkflowCapabilities } from "../../widget/WorkflowCapabilities";

export const capabilities: WorkflowCapabilities = [
  "qr.generate",
  "qr.customize",
  "qr.download",
  "qr.print",
  "qr.scan.camera",
  "qr.scan.upload",
  "api.scan",
];

const roots = new WeakMap<HTMLElement, Root>();

/**
 * Embedded workflow adapter.
 *
 * The standalone QR Tools application owns the canonical Equipment Maintenance
 * workflow UI and behavior. The widget deliberately mounts that same React
 * workflow instead of maintaining a second DOM implementation.
 */
export function renderEquipmentMaintenance(
  element: HTMLElement,
  _config: QrToolsWidgetConfig,
): void {
  let root = roots.get(element);
  if (!root) {
    root = createRoot(element);
    roots.set(element, root);
  }

  root.render(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(EquipmentMaintenanceWorkflow, {
        onBack: () => undefined,
      }),
    ),
  );
}
