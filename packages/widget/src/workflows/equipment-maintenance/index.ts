import "../../widget/widget.css";
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
 * Embedded workflow adapter. Reuses the canonical workflow without importing
 * the standalone application's global Tailwind preflight.
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
        commercialMode: "embedded",
      }),
    ),
  );
}
