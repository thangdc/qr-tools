import QRCode from "qrcode";
import jsQR from "jsqr";

export interface QrToolsWidgetConfig {
  apiKey: string;
  baseUrl?: string;
  workflowId?: string;
  theme?: "light" | "dark" | "auto";
  initialData?: EquipmentRecord[];
}

interface EquipmentRecord {
  assetId: string;
  assetName: string;
  location: string;
}

interface ScanResponse {
  success: boolean;
  identity?: { version: number; workflowId: string; recordId: string };
  workflow?: Record<string, unknown> | null;
  record?: Record<string, unknown> | null;
  actions?: Array<{ type: string; data?: Record<string, unknown> }>;
  error?: { message?: string };
}

const DEFAULT_BASE_URL = "https://api.thangdc.com";
const STYLE_ID = "qr-tools-workflow-widget-style";

function escapeHtml(value: unknown): string {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function base64Url(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function makePayload(workflowId: string, recordId: string): string {
  return `qrtools:${base64Url({ version: 1, workflowId, recordId })}`;
}

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .qrw{font:14px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;border:1px solid #d9dee7;border-radius:16px;padding:20px;background:#fff;color:#172033;max-width:820px;box-sizing:border-box}
    .qrw[data-theme="dark"]{background:#111827;color:#f3f4f6;border-color:#374151}
    .qrw *{box-sizing:border-box}.qrw h2{margin:0 0 4px;font-size:20px}.qrw p{margin:0 0 16px}.qrw__muted{color:#667085}
    .qrw__steps{display:flex;gap:8px;overflow:auto;margin:0 0 20px;padding-bottom:4px}.qrw__step{white-space:nowrap;border:1px solid #d0d5dd;border-radius:999px;padding:6px 12px}.qrw__step--active{font-weight:700;border-color:#344054}
    .qrw__grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.qrw__field{display:grid;gap:5px}.qrw__field--full{grid-column:1/-1}.qrw input,.qrw select{width:100%;border:1px solid #d0d5dd;border-radius:8px;padding:10px;background:inherit;color:inherit}
    .qrw__toolbar{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.qrw button{border:1px solid #98a2b3;border-radius:8px;background:#fff;color:#172033;padding:9px 13px;cursor:pointer}.qrw button:disabled{opacity:.5;cursor:not-allowed}.qrw__primary{font-weight:700;border-color:#344054!important}.qrw__preview{text-align:center;border:1px dashed #d0d5dd;border-radius:12px;padding:20px;margin-top:16px}.qrw__preview canvas,.qrw__preview img{max-width:100%}.qrw__records{width:100%;border-collapse:collapse;margin-top:12px}.qrw__records th,.qrw__records td{text-align:left;border-bottom:1px solid #eaecf0;padding:8px}.qrw__error{color:#b42318;background:#fef3f2;border:1px solid #fecdca;padding:10px;border-radius:8px;margin-top:12px}.qrw__result{border:1px solid #d0d5dd;border-radius:10px;padding:14px;margin-top:12px}
    @media(max-width:600px){.qrw{padding:14px}.qrw__grid{grid-template-columns:1fr}.qrw__field--full{grid-column:auto}}
  `;
  document.head.appendChild(style);
}

function resolveConfig(element: HTMLElement, config?: QrToolsWidgetConfig): QrToolsWidgetConfig {
  const d = element.dataset;
  return { apiKey: d.apiKey || config?.apiKey || "", baseUrl: d.baseUrl || config?.baseUrl || DEFAULT_BASE_URL, workflowId: d.workflowId || config?.workflowId || "equipment-maintenance", theme: (d.theme as QrToolsWidgetConfig["theme"]) || config?.theme || "auto", initialData: config?.initialData };
}

async function apiPost(config: QrToolsWidgetConfig, path: string, body: Record<string, unknown>): Promise<ScanResponse> {
  if (!config.apiKey) throw new Error("QR Tools API key is required.");
  const response = await fetch((config.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "") + path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` }, body: JSON.stringify(body) });
  const data = await response.json() as ScanResponse;
  if (!response.ok) throw new Error(data.error?.message || `QR Tools API returned HTTP ${response.status}.`);
  return data;
}

function shell(element: HTMLElement, config: QrToolsWidgetConfig, body: string): void {
  element.innerHTML = `<div class="qrw" data-theme="${escapeHtml(config.theme || "auto")}"><h2>Bảo trì thiết bị</h2><p class="qrw__muted">QR Tools · Equipment Maintenance</p><div class="qrw__steps"><span class="qrw__step qrw__step--active">① Chọn dữ liệu</span><span class="qrw__step">② Tạo QR</span><span class="qrw__step">③ In / Download</span><span class="qrw__step">④ Quét QR</span><span class="qrw__step">⑤ Kết quả</span></div>${body}</div>`;
}

function readForm(root: HTMLElement): EquipmentRecord {
  const get = (name: string) => (root.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value || "").trim();
  return { assetId: get("assetId"), assetName: get("assetName"), location: get("location") };
}

async function renderGenerate(element: HTMLElement, config: QrToolsWidgetConfig, records: EquipmentRecord[]): Promise<void> {
  const record = records[0];
  const payload = makePayload(config.workflowId || "equipment-maintenance", record.assetId);
  shell(element, config, `<div class="qrw__result"><strong>Thiết bị đã chọn</strong><div>${escapeHtml(record.assetName)} · ${escapeHtml(record.assetId)} · ${escapeHtml(record.location)}</div></div><div class="qrw__preview"><canvas id="qrw-canvas"></canvas><div class="qrw__muted">${escapeHtml(payload)}</div></div><div class="qrw__toolbar"><button class="qrw__primary" data-next>Tiếp tục</button><button data-download>Tải PNG</button><button data-print>In QR</button><button data-back>Quay lại</button></div>`);
  const canvas = element.querySelector<HTMLCanvasElement>("#qrw-canvas");
  if (canvas) await QRCode.toCanvas(canvas, payload, { width: 240, margin: 2 });
  element.querySelector<HTMLButtonElement>("[data-download]")?.addEventListener("click", () => { if (!canvas) return; const a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = `${record.assetId}.png`; a.click(); });
  element.querySelector<HTMLButtonElement>("[data-print]")?.addEventListener("click", () => { if (!canvas) return; const win = window.open("", "_blank", "noopener,noreferrer"); if (!win) return; win.document.write(`<title>${escapeHtml(record.assetName)}</title><img src="${canvas.toDataURL("image/png")}" style="width:320px"><script>window.onload=()=>window.print()<\/script>`); win.document.close(); });
  element.querySelector<HTMLButtonElement>("[data-back]")?.addEventListener("click", () => void renderInput(element, config, records));
  element.querySelector<HTMLButtonElement>("[data-next]")?.addEventListener("click", () => void renderScan(element, config, payload));
}

function renderInput(element: HTMLElement, config: QrToolsWidgetConfig, existing: EquipmentRecord[] = []): void {
  const record = existing[0] || { assetId: "", assetName: "", location: "" };
  shell(element, config, `<div class="qrw__grid"><label class="qrw__field"><span>Mã thiết bị</span><input name="assetId" value="${escapeHtml(record.assetId)}" placeholder="EQ-001"></label><label class="qrw__field"><span>Tên thiết bị</span><input name="assetName" value="${escapeHtml(record.assetName)}" placeholder="Máy lạnh tầng 1"></label><label class="qrw__field qrw__field--full"><span>Vị trí</span><input name="location" value="${escapeHtml(record.location)}" placeholder="Tầng 1"></label></div><div class="qrw__toolbar"><button class="qrw__primary" data-generate>Tạo QR</button></div>`);
  element.querySelector<HTMLButtonElement>("[data-generate]")?.addEventListener("click", () => { const next = readForm(element); if (!next.assetId || !next.assetName) { const error = document.createElement("div"); error.className = "qrw__error"; error.textContent = "Vui lòng nhập mã và tên thiết bị."; element.querySelector(".qrw")?.appendChild(error); return; } void renderGenerate(element, config, [next]); });
}

async function renderScan(element: HTMLElement, config: QrToolsWidgetConfig, payload: string): Promise<void> {
  shell(element, config, `<div class="qrw__result"><strong>Sẵn sàng quét</strong><p>Quét mã QR bằng camera hoặc chọn ảnh QR.</p><input type="file" accept="image/*" data-qr-image></div><div class="qrw__toolbar"><button data-scan-payload>Quét QR vừa tạo</button><button data-back>Quay lại</button></div>`);
  const scan = async (value: string) => { try { shell(element, config, `<div class="qrw__result">Đang quét…</div>`); const result = await apiPost(config, "/v1/scan", { payload: value }); renderResult(element, config, result, value); } catch (error) { shell(element, config, `<div class="qrw__error">${escapeHtml(error instanceof Error ? error.message : String(error))}</div><div class="qrw__toolbar"><button data-back>Quay lại</button></div>`); element.querySelector<HTMLButtonElement>("[data-back]")?.addEventListener("click", () => void renderInput(element, config)); } };
  element.querySelector<HTMLButtonElement>("[data-scan-payload]")?.addEventListener("click", () => void scan(payload));
  element.querySelector<HTMLInputElement>("[data-qr-image]")?.addEventListener("change", async (event) => { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; const bitmap = await createImageBitmap(file); const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height; const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.drawImage(bitmap, 0, 0); const image = ctx.getImageData(0, 0, canvas.width, canvas.height); const result = jsQR(image.data, image.width, image.height); if (!result) { alert("Không đọc được mã QR từ ảnh."); return; } await scan(result.data); });
  element.querySelector<HTMLButtonElement>("[data-back]")?.addEventListener("click", () => void renderInput(element));
}

function renderResult(element: HTMLElement, config: QrToolsWidgetConfig, result: ScanResponse, payload: string): void {
  const record = result.record || {};
  const rows = Object.entries(record).map(([key, value]) => `<div><strong>${escapeHtml(key)}</strong>: ${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</div>`).join("");
  const actions = (result.actions || []).map((action, index) => `<button data-action="${index}">${escapeHtml(action.type)}</button>`).join("");
  shell(element, config, `<div class="qrw__result"><strong>Kết quả</strong>${rows || "<div class=\"qrw__muted\">Không có dữ liệu bản ghi.</div>"}</div><div class="qrw__toolbar">${actions}<button data-back>Quét lại</button></div>`);
  element.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => button.addEventListener("click", async () => { const action = result.actions?.[Number(button.dataset.action)]; if (!action) return; button.disabled = true; try { await apiPost(config, "/v1/actions/execute", { scan_payload: payload, action }); button.textContent = "Đã thực hiện"; } catch (error) { button.disabled = false; button.textContent = error instanceof Error ? error.message : "Lỗi"; } }));
  element.querySelector<HTMLButtonElement>("[data-back]")?.addEventListener("click", () => void renderInput(element, config));
}

export async function mount(element: HTMLElement, config?: QrToolsWidgetConfig): Promise<void> {
  injectStyles();
  const resolved = resolveConfig(element, config);
  if (!resolved.apiKey) { shell(element, resolved, `<div class="qrw__error">QR Tools API key is required.</div>`); return; }
  if (resolved.workflowId !== "equipment-maintenance") { shell(element, resolved, `<div class="qrw__error">Workflow '${escapeHtml(resolved.workflowId)}' chưa được hỗ trợ bởi widget này.</div>`); return; }
  renderInput(element, resolved, resolved.initialData || []);
}

export function init(config: QrToolsWidgetConfig): void {
  injectStyles();
  document.querySelectorAll<HTMLElement>("[data-qr-tools]").forEach((element) => void mount(element, config));
}

function boot(): void {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script || script.dataset.autoInit === "false") return;
  const run = () => document.querySelectorAll<HTMLElement>(script.dataset.selector || "[data-qr-tools]").forEach((element) => void mount(element, { apiKey: script.dataset.apiKey || "", baseUrl: script.dataset.baseUrl, workflowId: script.dataset.workflow || "equipment-maintenance", theme: script.dataset.theme as QrToolsWidgetConfig["theme"] }));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true }); else run();
}

const api = { init, mount };
(globalThis as typeof globalThis & { QrToolsWidget?: typeof api }).QrToolsWidget = api;
boot();
