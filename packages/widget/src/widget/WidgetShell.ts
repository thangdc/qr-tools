import widgetCss from "./widget.css?inline";
import type { QrToolsWidgetConfig } from "./WidgetConfig";

export interface WidgetStep { id: string; label: string; }

export function injectWidgetStyles(): void {
  const id = "qr-tools-widget-style";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = widgetCss;
  document.head.appendChild(style);
}

export function renderShell(element: HTMLElement, config: QrToolsWidgetConfig, title: string, subtitle: string, steps: WidgetStep[], activeStep: string, body: string): void {
  const stepHtml = steps.map((step) =>
    `<span class="qrw__step ${step.id === activeStep ? "qrw__step--active" : ""}">${step.label}</span>`,
  ).join("");
  element.innerHTML = `
    <div class="qrw" data-theme="${config.theme || "auto"}">
      <header class="qrw__header"><div class="qrw__eyebrow">QR Tools · Workflow</div><h1 class="qrw__title">${title}</h1><p class="qrw__subtitle">${subtitle}</p></header>
      <div class="qrw__steps">${stepHtml}</div>
      ${body}
    </div>
  `;
}
