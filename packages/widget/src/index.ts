import { injectWidgetStyles } from "./widget/WidgetShell";
import { resolveConfig, type QrToolsWidgetConfig } from "./widget/WidgetConfig";
import { getClientWorkflow } from "./widget/WorkflowRegistry";

export type { QrToolsWidgetConfig };

export function mount(element: HTMLElement, config?: QrToolsWidgetConfig): void {
  injectWidgetStyles();
  const resolved = resolveConfig(element, config);
  const workflow = getClientWorkflow(resolved.workflowId || "");
  if (!workflow) {
    element.innerHTML = `<div class="qrw" data-theme="${resolved.theme || "auto"}"><div class="qrw__error">Workflow '${resolved.workflowId}' chưa được hỗ trợ bởi widget này.</div></div>`;
    return;
  }
  workflow.mount(element, resolved);
}

export function init(config: QrToolsWidgetConfig): void {
  document.querySelectorAll<HTMLElement>("[data-qr-tools]").forEach((element) => mount(element, config));
}

function boot(): void {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script || script.dataset.autoInit === "false") return;
  const run = () => {
    const selector = script.dataset.selector || script.dataset.container || "[data-qr-tools]";
    const elements = document.querySelectorAll<HTMLElement>(selector);
    elements.forEach((element) => mount(element, {
      apiKey: script.dataset.apiKey || "",
      baseUrl: script.dataset.baseUrl,
      workflowId: script.dataset.workflow || "equipment-maintenance",
      theme: script.dataset.theme as QrToolsWidgetConfig["theme"],
    }));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
}

const api = { init, mount };
(globalThis as typeof globalThis & { QrToolsWidget?: typeof api }).QrToolsWidget = api;
boot();
