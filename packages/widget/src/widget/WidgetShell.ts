import type { QrToolsWidgetConfig } from "./WidgetConfig";

export interface WidgetStep {
  id: string;
  label: string;
}

export function injectWidgetStyles(): void {
  const id = "qr-tools-widget-style";
  if (document.getElementById(id)) return;

  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    .qrw{font:14px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;border:1px solid #d9dee7;border-radius:16px;padding:20px;background:#fff;color:#172033;max-width:820px;box-sizing:border-box}
    .qrw[data-theme="dark"]{background:#111827;color:#f3f4f6;border-color:#374151}
    .qrw *{box-sizing:border-box}.qrw h2{margin:0 0 4px;font-size:20px}.qrw p{margin:0 0 16px}.qrw__muted{color:#667085}
    .qrw__steps{display:flex;gap:8px;overflow:auto;margin:0 0 20px;padding-bottom:4px}.qrw__step{white-space:nowrap;border:1px solid #d0d5dd;border-radius:999px;padding:6px 12px}.qrw__step--active{font-weight:700;border-color:#344054}
    .qrw__error{color:#b42318;background:#fef3f2;border:1px solid #fecdca;padding:10px;border-radius:8px;margin-top:12px}
    .qrw__grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.qrw__field{display:grid;gap:5px}.qrw__field--full{grid-column:1/-1}
    .qrw input,.qrw select{width:100%;border:1px solid #d0d5dd;border-radius:8px;padding:10px;background:inherit;color:inherit}
    .qrw__toolbar{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.qrw button{border:1px solid #98a2b3;border-radius:8px;background:#fff;color:#172033;padding:9px 13px;cursor:pointer}.qrw button:disabled{opacity:.5;cursor:not-allowed}
    .qrw__primary{font-weight:700;border-color:#344054!important}.qrw__preview{text-align:center;border:1px dashed #d0d5dd;border-radius:12px;padding:20px;margin-top:16px}
    .qrw__result{border:1px solid #d0d5dd;border-radius:10px;padding:14px;margin-top:12px}
    @media(max-width:600px){.qrw{padding:14px}.qrw__grid{grid-template-columns:1fr}.qrw__field--full{grid-column:auto}}
  `;
  document.head.appendChild(style);
}

export function renderShell(
  element: HTMLElement,
  config: QrToolsWidgetConfig,
  title: string,
  subtitle: string,
  steps: WidgetStep[],
  activeStep: string,
  body: string,
): void {
  const stepHtml = steps.map((step) =>
    `<span class="qrw__step ${step.id === activeStep ? "qrw__step--active" : ""}">${step.label}</span>`,
  ).join("");

  element.innerHTML = `
    <div class="qrw" data-theme="${config.theme || "auto"}">
      <h2>${title}</h2>
      <p class="qrw__muted">${subtitle}</p>
      <div class="qrw__steps">${stepHtml}</div>
      ${body}
    </div>
  `;
}
