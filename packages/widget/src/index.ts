export interface QrToolsWidgetConfig {
  apiKey: string;
  baseUrl?: string;
  selector?: string;
  payload?: string;
  workflowId?: string;
  theme?: "light" | "dark" | "auto";
  showActions?: boolean;
  onSuccess?: (result: ScanResponse, element: HTMLElement) => void;
  onError?: (error: Error, element?: HTMLElement) => void;
}

export interface ScanResponse {
  success: boolean;
  action?: { type: string; data?: Record<string, unknown> } | null;
  identity?: { version: number; workflowId: string; recordId: string };
  workflow?: Record<string, unknown> | null;
  record?: Record<string, unknown> | null;
  actions?: Array<{ type: string; data?: Record<string, unknown> }>;
  [key: string]: unknown;
}

const DEFAULT_BASE_URL = "https://api.thangdc.com";
const STYLE_ID = "qr-tools-widget-style";

function escapeHtml(value: unknown): string {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = [
    '.qr-tools-widget{font:14px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;border:1px solid #d9dee7;border-radius:12px;padding:16px;background:#fff;color:#172033;max-width:640px;box-sizing:border-box}',
    '.qr-tools-widget[data-theme="dark"]{background:#111827;color:#f3f4f6;border-color:#374151}',
    '.qr-tools-widget__muted{color:#667085}',
    '.qr-tools-widget__error{color:#b42318;background:#fef3f2;border:1px solid #fecdca;padding:10px;border-radius:8px}',
    '.qr-tools-widget__grid{display:grid;gap:8px;margin:12px 0}',
    '.qr-tools-widget__row{display:grid;grid-template-columns:140px 1fr;gap:12px}',
    '.qr-tools-widget__key{font-weight:600}',
    '.qr-tools-widget__actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}',
    '.qr-tools-widget__button{border:1px solid #98a2b3;border-radius:8px;background:#fff;padding:8px 12px;cursor:pointer}',
    '.qr-tools-widget__button:disabled{opacity:.6;cursor:wait}',
    '@media(max-width:480px){.qr-tools-widget__row{grid-template-columns:1fr;gap:2px}}'
  ].join("");
  document.head.appendChild(style);
}

function normalizeBaseUrl(value: string): string { return value.trim().replace(/\/+$/, ""); }

function configFromElement(element: HTMLElement, global?: QrToolsWidgetConfig): QrToolsWidgetConfig {
  const d = element.dataset;
  return {
    apiKey: d.apiKey || global?.apiKey || "",
    baseUrl: d.baseUrl || global?.baseUrl || DEFAULT_BASE_URL,
    selector: global?.selector,
    payload: d.payload || global?.payload,
    workflowId: d.workflowId || global?.workflowId,
    theme: (d.theme as QrToolsWidgetConfig["theme"]) || global?.theme || "auto",
    showActions: d.showActions !== "false" && global?.showActions !== false,
    onSuccess: global?.onSuccess,
    onError: global?.onError,
  };
}

async function post(config: QrToolsWidgetConfig, path: string, body: Record<string, unknown>): Promise<ScanResponse> {
  if (!config.apiKey) throw new Error("QR Tools API key is required.");
  const response = await fetch(normalizeBaseUrl(config.baseUrl || DEFAULT_BASE_URL) + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + config.apiKey },
    body: JSON.stringify(body),
  });
  let data: ScanResponse & { error?: { message?: string } };
  try { data = await response.json() as typeof data; }
  catch { throw new Error("QR Tools API returned HTTP " + response.status + "."); }
  if (!response.ok) throw new Error(data.error?.message || "QR Tools API returned HTTP " + response.status + ".");
  return data;
}

function renderError(element: HTMLElement, error: Error): void {
  element.innerHTML = '<div class="qr-tools-widget"><div class="qr-tools-widget__error">' + escapeHtml(error.message) + '</div></div>';
}

function renderResult(element: HTMLElement, result: ScanResponse, config: QrToolsWidgetConfig): void {
  const record = result.record || {};
  const recordEntries = Object.entries(record).filter(([key]) => key !== "data" && key !== "actions");
  const dataEntries = result.record?.data && typeof result.record.data === "object" ? Object.entries(result.record.data) : [];
  const rows = recordEntries.concat(dataEntries).slice(0, 30).map(([key, value]) =>
    '<div class="qr-tools-widget__row"><div class="qr-tools-widget__key">' + escapeHtml(key) + '</div><div>' + escapeHtml(typeof value === "object" ? JSON.stringify(value) : value) + '</div></div>'
  ).join("");
  const actions = config.showActions ? (result.actions || []).map((action, index) =>
    '<button type="button" class="qr-tools-widget__button" data-qr-action="' + index + '">' + escapeHtml(action.type) + '</button>'
  ).join("") : "";
  const title = result.identity ? escapeHtml(result.identity.workflowId) + " · " + escapeHtml(result.identity.recordId) : "QR Tools";
  element.innerHTML = '<div class="qr-tools-widget" data-theme="' + (config.theme || "auto") + '"><div><strong>' + title + '</strong></div><div class="qr-tools-widget__grid">' + (rows || '<div class="qr-tools-widget__muted">Không có dữ liệu bản ghi.</div>') + '</div>' + (actions ? '<div class="qr-tools-widget__actions">' + actions + '</div>' : "") + '</div>';
  element.querySelectorAll<HTMLButtonElement>("[data-qr-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = result.actions?.[Number(button.dataset.qrAction)];
      if (!action || !config.payload) return;
      button.disabled = true;
      const original = button.textContent || action.type;
      button.textContent = "Đang xử lý…";
      try {
        await post(config, "/v1/actions/execute", { scan_payload: config.payload, action });
        button.textContent = "Đã thực hiện";
      } catch (error) {
        button.disabled = false;
        button.textContent = original;
        config.onError?.(error instanceof Error ? error : new Error(String(error)), element);
      }
    });
  });
}

export async function scan(payload: string, config: QrToolsWidgetConfig, element?: HTMLElement): Promise<ScanResponse> {
  if (!payload.trim()) throw new Error("QR payload is required.");
  const result = await post(config, "/v1/scan", { payload });
  if (element) { renderResult(element, result, { ...config, payload }); config.onSuccess?.(result, element); }
  return result;
}

export async function mount(element: HTMLElement, config?: QrToolsWidgetConfig): Promise<ScanResponse | null> {
  injectStyles();
  const resolved = configFromElement(element, config);
  if (!resolved.apiKey) { const error = new Error("QR Tools API key is required."); renderError(element, error); resolved.onError?.(error, element); throw error; }
  if (!resolved.payload) { element.innerHTML = '<div class="qr-tools-widget"><div class="qr-tools-widget__muted">Chưa có QR payload.</div></div>'; return null; }
  element.innerHTML = '<div class="qr-tools-widget"><div>Đang tải dữ liệu QR…</div></div>';
  try { return await scan(resolved.payload, resolved, element); }
  catch (error) { const normalized = error instanceof Error ? error : new Error(String(error)); renderError(element, normalized); resolved.onError?.(normalized, element); throw normalized; }
}

export function init(config: QrToolsWidgetConfig): void {
  injectStyles();
  document.querySelectorAll<HTMLElement>(config.selector || "[data-qr-tools]").forEach((element) => { void mount(element, config).catch(() => undefined); });
}

function boot(): void {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script || script.dataset.autoInit === "false") return;
  const run = () => {
    const selector = script.dataset.selector || "[data-qr-tools]";
    const config: QrToolsWidgetConfig = {
      apiKey: script.dataset.apiKey || "",
      baseUrl: script.dataset.baseUrl || DEFAULT_BASE_URL,
      theme: (script.dataset.theme as QrToolsWidgetConfig["theme"]) || "auto",
      showActions: script.dataset.showActions !== "false",
    };
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => { void mount(element, config).catch(() => undefined); });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true }); else run();
}

const api = { init, mount, scan };
(globalThis as typeof globalThis & { QrToolsWidget?: typeof api }).QrToolsWidget = api;
boot();