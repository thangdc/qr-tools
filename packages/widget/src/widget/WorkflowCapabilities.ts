export type WorkflowCapability =
  | "qr.generate"
  | "qr.customize"
  | "qr.download"
  | "qr.print"
  | "qr.scan.camera"
  | "qr.scan.upload"
  | "api.scan";

export type WorkflowCapabilities = readonly WorkflowCapability[];

export function hasCapability(
  capabilities: WorkflowCapabilities,
  capability: WorkflowCapability,
): boolean {
  return capabilities.includes(capability);
}
