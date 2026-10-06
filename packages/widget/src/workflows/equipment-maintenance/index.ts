import QRCode from "qrcode";
import jsQR from "jsqr";
import type { QrToolsWidgetConfig } from "../../widget/WidgetConfig";
import { renderShell, type WidgetStep } from "../../widget/WidgetShell";

interface EquipmentRecord {
  assetId: string;
  assetName: string;
  location: string;
}

interface ScanResponse {
  success: boolean;
  record?: Record<string, unknown> | null;
  actions?: Array<{ type: string; data?: Record<string, unknown> }>;
  error?: { message?: string };
}

const steps: WidgetStep[] = [
  { id: "data", label: "① Chọn dữ liệu" },
  { id: "qr", label: "② Tạo QR" },
  { id: "print", label: "③ In / Download" },
  { id: "scan", label: "④ Quét QR" },
  { id: "result", label: "⑤ Kết quả" },
];

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function base64Url(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function makePayload(recordId: string): string {
  return `qrtools:${base64Url({ version: 1, workflowId: "equipment-maintenance", recordId })}`;
}

async function apiPost(config: QrToolsWidgetConfig, path: string, body: Record<string, unknown>): Promise<ScanResponse> {
  if (!config.apiKey) throw new Error("QR Tools API key is required.");
  const response = await fetch(`${(config.baseUrl || "https://api.thangdc.com").replace(/\/+$/, "")}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify(body),
  });
  const data = await response.json() as ScanResponse;
  if (!response.ok) throw new Error(data.error?.message || `QR Tools API returned HTTP ${response.status}.`);
  return data;
}

function readForm(root: HTMLElement): EquipmentRecord {
  const get = (name: string) => (root.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value || "").trim();
  return { assetId: get("assetId"), assetName: get("assetName"), location: get("location") };
}

function renderInput(element: HTMLElement, config: QrToolsWidgetConfig, existing: EquipmentRecord[] = []): void {
  const record = existing[0] || { assetId: "", assetName: "", location: "" };
  renderShell(element, config, "Bảo trì thiết bị", "QR Tools · Equipment Maintenance", steps, "data", `
    <div class="qrw__grid">
      <label class="qrw__field"><span>Mã thiết bị</span><input name="assetId" value="${escapeHtml(record.assetId)}" placeholder="EQ-001"></label>
      <label class="qrw__field"><span>Tên thiết bị</span><input name="assetName" value="${escapeHtml(record.assetName)}" placeholder="Máy lạnh tầng 1"></label>
      <label class="qrw__field qrw__field--full"><span>Vị trí</span><input name="location" value="${escapeHtml(record.location)}" placeholder="Tầng 1"></label>
    </div>
    <div class="qrw__toolbar"><button class="qrw__primary" data-generate>Tạo QR</button></div>
  `);
  element.querySelector<HTMLButtonElement>("[data-generate]")?.addEventListener("click", () => {
    const next = readForm(element);
    if (!next.assetId || !next.assetName) {
      const error = document.createElement("div");
      error.className = "qrw__error";
      error.textContent = "Vui lòng nhập mã và tên thiết bị.";
      element.querySelector(".qrw")?.appendChild(error);
      return;
    }
    void renderQr(element, config, next);
  });
}

async function renderQr(element: HTMLElement, config: QrToolsWidgetConfig, record: EquipmentRecord): Promise<void> {
  const payload = makePayload(record.assetId);
  renderShell(element, config, "Bảo trì thiết bị", "QR Tools · Equipment Maintenance", steps, "qr", `
    <div class="qrw__result"><strong>Thiết bị đã chọn</strong><div>${escapeHtml(record.assetName)} · ${escapeHtml(record.assetId)} · ${escapeHtml(record.location)}</div></div>
    <div class="qrw__preview"><canvas id="qrw-canvas"></canvas><div class="qrw__muted">${escapeHtml(payload)}</div></div>
    <div class="qrw__toolbar">
      <button class="qrw__primary" data-next>Tiếp tục</button>
      <button data-download>Tải PNG</button>
      <button data-print>In QR</button>
      <button data-back>Quay lại</button>
    </div>
  `);
  const canvas = element.querySelector<HTMLCanvasElement>("#qrw-canvas");
  if (canvas) await QRCode.toCanvas(canvas, payload, { width: 240, margin: 2 });
  element.querySelector<HTMLButtonElement>("[data-download]")?.addEventListener("click", () => {
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${record.assetId}.png`;
    link.click();
  });
  element.querySelector<HTMLButtonElement>("[data-print]")?.addEventListener("click", () => {
    if (!canvas) return;
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    win.document.write(`<title>${escapeHtml(record.assetName)}</title><img src="${canvas.toDataURL("image/png")}" style="width:320px"><script>window.onload=()=>window.print()<\\/script>`);
    win.document.close();
  });
  element.querySelector<HTMLButtonElement>("[data-back]")?.addEventListener("click", () => renderInput(element, config, [record]));
  element.querySelector<HTMLButtonElement>("[data-next]")?.addEventListener("click", () => renderScan(element, config, payload, record));
}

async function renderScan(element: HTMLElement, config: QrToolsWidgetConfig, payload: string, record: EquipmentRecord): Promise<void> {
  renderShell(element, config, "Bảo trì thiết bị", "QR Tools · Equipment Maintenance", steps, "scan", `
    <div class="qrw__result"><strong>Sẵn sàng quét</strong><p>Quét mã QR bằng camera hoặc chọn ảnh QR.</p><input type="file" accept="image/*" data-qr-image></div>
    <div class="qrw__toolbar"><button class="qrw__primary" data-scan-payload>Quét QR vừa tạo</button><button data-back>Quay lại</button></div>
  `);
  const scan = async (value: string) => {
    try {
      renderShell(element, config, "Bảo trì thiết bị", "QR Tools · Equipment Maintenance", steps, "scan", '<div class="qrw__result">Đang quét…</div>');
      const result = await apiPost(config, "/v1/scan", { payload: value });
      renderResult(element, config, result, value, record);
    } catch (error) {
      renderShell(element, config, "Bảo trì thiết bị", "QR Tools · Equipment Maintenance", steps, "scan", `<div class="qrw__error">${escapeHtml(error instanceof Error ? error.message : String(error))}</div><div class="qrw__toolbar"><button data-back>Quay lại</button></div>`);
      element.querySelector<HTMLButtonElement>("[data-back]")?.addEventListener("click", () => renderInput(element, config, [record]));
    }
  };
  element.querySelector<HTMLButtonElement>("[data-scan-payload]")?.addEventListener("click", () => void scan(payload));
  element.querySelector<HTMLInputElement>("[data-qr-image]")?.addEventListener("change", async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(image.data, image.width, image.height);
    if (!result) { alert("Không đọc được mã QR từ ảnh."); return; }
    await scan(result.data);
  });
  element.querySelector<HTMLButtonElement>("[data-back]")?.addEventListener("click", () => renderInput(element, config, [record]));
}

function renderResult(element: HTMLElement, config: QrToolsWidgetConfig, result: ScanResponse, payload: string, record: EquipmentRecord): void {
  const values = result.record || {};
  const rows = Object.entries(values).map(([key, value]) =>
    `<div><strong>${escapeHtml(key)}</strong>: ${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</div>`,
  ).join("");
  const actions = (result.actions || []).map((action, index) =>
    `<button data-action="${index}">${escapeHtml(action.type)}</button>`,
  ).join("");
  renderShell(element, config, "Bảo trì thiết bị", "QR Tools · Equipment Maintenance", steps, "result", `
    <div class="qrw__result"><strong>Kết quả</strong>${rows || '<div class="qrw__muted">Không có dữ liệu bản ghi.</div>'}</div>
    <div class="qrw__toolbar">${actions}<button data-back>Quét lại</button></div>
  `);
  element.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => button.addEventListener("click", async () => {
    const action = result.actions?.[Number(button.dataset.action)];
    if (!action) return;
    button.disabled = true;
    try {
      await apiPost(config, "/v1/actions/execute", { scan_payload: payload, action });
      button.textContent = "Đã thực hiện";
    } catch (error) {
      button.disabled = false;
      button.textContent = error instanceof Error ? error.message : "Lỗi";
    }
  }));
  element.querySelector<HTMLButtonElement>("[data-back]")?.addEventListener("click", () => renderInput(element, config, [record]));
}

export function renderEquipmentMaintenance(element: HTMLElement, config: QrToolsWidgetConfig): void {
  renderInput(element, config, (config.initialData || []) as EquipmentRecord[]);
}
