export type WidgetTheme = "light" | "dark" | "auto";

export interface QrToolsWidgetConfig {
  apiKey: string;
  baseUrl?: string;
  workflowId?: string;
  theme?: WidgetTheme;
  initialData?: unknown[];
}

export const DEFAULT_BASE_URL = "https://api.thangdc.com";

export function resolveConfig(
  element: HTMLElement,
  config?: QrToolsWidgetConfig,
): QrToolsWidgetConfig {
  const d = element.dataset;
  return {
    apiKey: d.apiKey || config?.apiKey || "",
    baseUrl: d.baseUrl || config?.baseUrl || DEFAULT_BASE_URL,
    workflowId: d.workflow || d.workflowId || config?.workflowId || "equipment-maintenance",
    theme: (d.theme as WidgetTheme) || config?.theme || "auto",
    initialData: config?.initialData,
  };
}
