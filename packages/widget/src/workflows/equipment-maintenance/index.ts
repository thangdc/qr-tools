import QRCode from "qrcode";
import jsQR from "jsqr";
import type { QrToolsWidgetConfig } from "../../widget/WidgetConfig";
import { renderShell, type WidgetStep } from "../../widget/WidgetShell";
import { hasCapability, type WorkflowCapabilities } from "../../widget/WorkflowCapabilities";

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

const capabilities: WorkflowCapabilities = [
  "qr.generate",
  "qr.customize",
  "qr.download",
  "qr.print",
  "qr.scan.camera",
  "qr.scan.upload",
  "api.scan",
];

const steps: WidgetStep[] = [
  { id: "data", label: "1. Nhập dữ liệu" },
  { id: "qr", label: "2. Tạo & tùy chỉnh QR" },
  { id: "scan", label: "3. Quét QR" },
  { id: "result", label: "4. Kết quả" },
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
  const record = existing[0] || { assetId: "EQ-API-001", assetName: "Máy lạnh phòng 101", location: "Phòng 101" };
  renderShell(element, config, "Bảo trì thiết bị", "Danh sách → tạo & in QR → quét → ghi nhận bảo trì.", steps, "data", `
    <section class="qrw__card">
      <div class="qrw__section-title">1. Thông tin thiết bị</div>
      <div class="qrw__section-note">Nhập thông tin sẽ được gắn với mã QR của thiết bị.</div>
      <div class="qrw__grid" style="margin-top:16px">
        <label class="qrw__field"><span>Mã thiết bị</span><input name="assetId" value="${escapeHtml(record.assetId)}" placeholder="EQ-001"></label>
        <label class="qrw__field"><span>Tên thiết bị</span><input name="assetName" value="${escapeHtml(record.assetName)}" placeholder="Máy lạnh tầng 1"></label>
        <label class="qrw__field qrw__field--full"><span>Vị trí</span><input name="location" value="${escapeHtml(record.location)}" placeholder="Tầng 1"></label>
      </div>
      <div class="qrw__toolbar"><button class="qrw__primary" data-generate>Tạo QR</button></div>
    </section>
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
  renderShell(element, config, "Bảo trì thiết bị", "Tạo mã QR theo đúng workflow, không cần History hay tài khoản.", steps, "qr", `
    <div class="qrw__columns">
      <section class="qrw__card">
        <div class="qrw__section-title">2. Xem trước mã QR</div>
        <div class="qrw__section-note">${escapeHtml(record.assetName)} · ${escapeHtml(record.assetId)} · ${escapeHtml(record.location)}</div>
        <div class="qrw__preview" style="margin-top:14px"><canvas id="qrw-canvas"></canvas></div>
        <div class="qrw__qr-meta">${escapeHtml(payload)}</div>
      </section>
      <section class="qrw__card">
        <div class="qrw__section-title">Tùy chỉnh</div>
        <div class="qrw__section-note">Các tùy chỉnh cần thiết cho QR của workflow.</div>
        <div class="qrw__customize" style="margin-top:14px">
          <label class="qrw__field"><span>Kích thước</span><select data-size><option value="240">Nhỏ</option><option value="360" selected>Vừa</option><option value="512">Lớn</option></select></label>
          <div class="qrw__color-row">
            <label class="qrw__field qrw__color"><span>Màu QR</span><input data-fg type="color" value="#171717"></label>
            <label class="qrw__field qrw__color"><span>Nền</span><input data-bg type="color" value="#ffffff"></label>
          </div>
          <label class="qrw__field"><span>Độ sửa lỗi</span><select data-ecc><option value="M" selected>Trung bình</option><option value="Q">Cao</option><option value="H">Rất cao</option></select></label>
        </div>
        <div class="qrw__toolbar">
          <button class="qrw__primary" data-next>Tiếp tục quét</button>
          <button data-download>Tải PNG</button>
          <button data-print>In QR</button>
          <button data-back>Quay lại</button>
        </div>
      </section>
    </div>
  `);
  const canvas = element.querySelector<HTMLCanvasElement>("#qrw-canvas");
  const fg = element.querySelector<HTMLInputElement>("[data-fg]");
  const bg = element.querySelector<HTMLInputElement>("[data-bg]");
  const size = element.querySelector<HTMLSelectElement>("[data-size]");
  const ecc = element.querySelector<HTMLSelectElement>("[data-ecc]");
  const render = async () => {
    if (!canvas) return;
    await QRCode.toCanvas(canvas, payload, {
      width: Number(size?.value || 360),
      margin: 2,
      errorCorrectionLevel: (ecc?.value || "M") as "L" | "M" | "Q" | "H",
      color: { dark: fg?.value || "#171717", light: bg?.value || "#ffffff" },
    });
  };
  await render();
  [fg, bg, size, ecc].forEach((control) => control?.addEventListener("input", () => void render()));
  if (hasCapability(capabilities, "qr.download")) element.querySelector<HTMLButtonElement>("[data-download]")?.addEventListener("click", () => {
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${record.assetId}.png`;
    link.click();
  });
  if (hasCapability(capabilities, "qr.print")) element.querySelector<HTMLButtonElement>("[data-print]")?.addEventListener("click", () => {
    if (!canvas) return;
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    win.document.write(`<title>${escapeHtml(record.assetName)}</title><img src="${canvas.toDataURL("image/png")}" style="width:320px"><script>window.onload=()=>window.print()<\\/script>`);
    win.document.close();
  });
  element.querySelector<HTMLButtonElement>("[data-back]")?.addEventListener("click", () => renderInput(element, config, [record]));
  if (hasCapability(capabilities, "qr.scan.camera") || hasCapability(capabilities, "qr.scan.upload")) {
    element.querySelector<HTMLButtonElement>("[data-next]")?.addEventListener("click", () => renderScan(element, config, payload, record));
  }
}

async function renderScan(element: HTMLElement, config: QrToolsWidgetConfig, payload: string, record: EquipmentRecord): Promise<void> {
  renderShell(element, config, "Bảo trì thiết bị", "QR Tools · Equipment Maintenance", steps, "scan", `
    <div class="qrw__scan">
      <video class="qrw__camera" data-camera autoplay muted playsinline></video>
      <div class="qrw__scan-status" data-scan-status>Camera chưa khởi động.</div>
    </div>
    <div class="qrw__toolbar">
      <button class="qrw__primary" data-camera-start>Bật camera</button>
      <label class="qrw__file-button">Tải ảnh QR<input type="file" accept="image/*" data-qr-image hidden></label>
      <button data-scan-payload>Quét QR vừa tạo</button>
      <button data-back>Quay lại</button>
    </div>
  `);
  let stream: MediaStream | null = null;
  let scanning = false;
  let animationFrame = 0;
  const stopCamera = () => {
    scanning = false;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    const video = element.querySelector<HTMLVideoElement>("[data-camera]");
    if (video) video.srcObject = null;
  };
  const scan = async (value: string) => {
    try {
      stopCamera();
      renderShell(element, config, "Bảo trì thiết bị", "QR Tools · Equipment Maintenance", steps, "scan", '<div class="qrw__result">Đang quét…</div>');
      if (!hasCapability(capabilities, "api.scan")) throw new Error("Workflow scan API is not enabled.");
      const result = await apiPost(config, "/v1/scan", { payload: value });
      renderResult(element, config, result, value, record);
    } catch (error) {
      renderShell(element, config, "Bảo trì thiết bị", "QR Tools · Equipment Maintenance", steps, "scan", `<div class="qrw__error">${escapeHtml(error instanceof Error ? error.message : String(error))}</div><div class="qrw__toolbar"><button data-back>Quay lại</button></div>`);
      element.querySelector<HTMLButtonElement>("[data-back]")?.addEventListener("click", () => renderInput(element, config, [record]));
    }
  };
  const startCamera = async () => {
    const video = element.querySelector<HTMLVideoElement>("[data-camera]");
    const status = element.querySelector<HTMLElement>("[data-scan-status]");
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      if (status) status.textContent = "Trình duyệt không hỗ trợ camera.";
      return;
    }
    try {
      stopCamera();
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      video.srcObject = stream;
      await video.play();
      scanning = true;
      if (status) status.textContent = "Đưa mã QR vào khung hình…";
      const tick = () => {
        if (!scanning) return;
        if (video.videoWidth && video.videoHeight) {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
            if (result?.data) {
              stopCamera();
              void scan(result.data);
              return;
            }
          }
        }
        animationFrame = requestAnimationFrame(tick);
      };
      animationFrame = requestAnimationFrame(tick);
    } catch (error) {
      if (status) status.textContent = error instanceof Error && error.name === "NotAllowedError"
        ? "Camera bị từ chối. Hãy cấp quyền camera hoặc dùng Tải ảnh QR."
        : "Không thể mở camera. Hãy thử Tải ảnh QR.";
    }
  };
  element.querySelector<HTMLButtonElement>("[data-camera-start]")?.addEventListener("click", () => void startCamera());
  element.querySelector<HTMLButtonElement>("[data-scan-payload]")?.addEventListener("click", () => void scan(payload));
  element.querySelector<HTMLInputElement>("[data-qr-image]")?.addEventListener("change", async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Không thể đọc ảnh QR.");
      ctx.drawImage(bitmap, 0, 0);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
      if (!result) throw new Error("Không đọc được mã QR từ ảnh.");
      await scan(result.data);
    } catch (error) {
      const status = element.querySelector<HTMLElement>("[data-scan-status]");
      if (status) status.textContent = error instanceof Error ? error.message : "Không đọc được mã QR.";
    }
  });
  element.querySelector<HTMLButtonElement>("[data-back]")?.addEventListener("click", () => { stopCamera(); renderInput(element, config, [record]); });
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
