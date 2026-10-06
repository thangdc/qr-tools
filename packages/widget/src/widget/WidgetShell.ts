import type { QrToolsWidgetConfig } from "./WidgetConfig";

export interface WidgetStep { id: string; label: string; }

export function injectWidgetStyles(): void {
  const id = "qr-tools-widget-style";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    .qrw{font:14px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f8fafc;color:#171717;max-width:960px;box-sizing:border-box}
    .qrw *{box-sizing:border-box}.qrw h1,.qrw h2,.qrw h3,.qrw p{margin:0}
    .qrw__header{padding:4px 0 18px;border-bottom:1px solid #e5e5e5}.qrw__eyebrow{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#737373}.qrw__title{font-size:24px;font-weight:800;letter-spacing:-.02em;margin-top:4px}.qrw__subtitle{font-size:13px;color:#737373;margin-top:4px}
    .qrw__steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:18px 0}.qrw__step{border:1px solid #e5e5e5;background:#fff;border-radius:10px;padding:9px 8px;text-align:center;font-size:11px;font-weight:600;color:#737373}.qrw__step--active{background:#171717;border-color:#171717;color:#fff}
    .qrw__card{background:#fff;border:1px solid #e5e5e5;border-radius:16px;padding:20px}.qrw__card--soft{background:#fafafa}.qrw__section-title{font-size:14px;font-weight:700}.qrw__section-note{font-size:12px;color:#737373;margin-top:4px}
    .qrw__grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.qrw__field{display:grid;gap:6px}.qrw__field--full{grid-column:1/-1}.qrw__field span{font-size:12px;font-weight:600;color:#404040}
    .qrw input,.qrw select{width:100%;height:38px;border:1px solid #d4d4d4;border-radius:9px;padding:0 11px;background:#fff;color:#171717;outline:none}.qrw input:focus,.qrw select:focus{border-color:#737373;box-shadow:0 0 0 3px #f5f5f5}
    .qrw__toolbar{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.qrw button,.qrw__file-button{height:38px;border:1px solid #d4d4d4;border-radius:9px;background:#fff;color:#262626;padding:0 14px;cursor:pointer;font:600 12px/1 system-ui;display:inline-flex;align-items:center;justify-content:center}.qrw button:hover,.qrw__file-button:hover{background:#fafafa}.qrw button:disabled{opacity:.5;cursor:not-allowed}.qrw__primary{background:#171717!important;border-color:#171717!important;color:#fff!important}
    .qrw__columns{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(260px,.95fr);gap:18px}.qrw__preview{display:flex;align-items:center;justify-content:center;min-height:300px;background:#fafafa;border:1px solid #e5e5e5;border-radius:12px;padding:18px}.qrw__preview canvas{max-width:100%;height:auto}.qrw__qr-meta{margin-top:10px;font-size:11px;color:#737373;word-break:break-all}
    .qrw__customize{display:grid;gap:12px}.qrw__color-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.qrw__color{display:grid;grid-template-columns:1fr 42px;gap:7px;align-items:center}.qrw__color input[type=color]{height:38px;padding:3px}
    .qrw__result{border:1px solid #e5e5e5;border-radius:12px;padding:14px;background:#fff}.qrw__result strong{font-size:13px}.qrw__result-row{padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:12px}.qrw__result-row:last-child{border-bottom:0}.qrw__muted{color:#737373}.qrw__error{color:#b42318;background:#fef2f2;border:1px solid #fecaca;padding:10px;border-radius:9px;margin-top:12px;font-size:12px}
    .qrw__scan{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(240px,.8fr);gap:18px}.qrw__camera-wrap{position:relative;min-height:320px;background:#171717;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center}.qrw__camera{width:100%;height:100%;min-height:320px;object-fit:cover}.qrw__viewfinder{position:absolute;inset:14%;border:2px solid rgba(255,255,255,.85);border-radius:16px;box-shadow:0 0 0 9999px rgba(0,0,0,.2);pointer-events:none}.qrw__status{font-size:12px;color:#737373;margin-top:8px}.qrw__empty{text-align:center;color:#a3a3a3;padding:38px 12px;font-size:12px}
    @media(max-width:700px){.qrw__grid,.qrw__columns,.qrw__scan{grid-template-columns:1fr}.qrw__field--full{grid-column:auto}.qrw__steps{grid-template-columns:repeat(2,1fr)}.qrw__card{padding:14px}.qrw__color-row{grid-template-columns:1fr}}
  `;
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
