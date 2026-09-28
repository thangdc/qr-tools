import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outputDir = path.join(root, 'public', 'screenshots', 'landing');
const baseUrl = 'https://qr.thangdc.com';
const proEmail = process.env.QR_PRO_EMAIL || '';
const proKey = process.env.QR_PRO_KEY || '';
const proDeviceId = 'qr-tools-github-actions-landing-screenshots';

if (!proEmail || !proKey) {
  throw new Error('QR_PRO_EMAIL and QR_PRO_KEY must be configured for landing screenshot capture.');
}

const captures = [
  {
    slug: 'tao-ma-qr-vietqr-online',
    url: `${baseUrl}/?type=payment&source=landing-vietqr`,
    image: 'vietqr.png',
    alt: 'Giao diện tạo mã QR VietQR trên QR Tools',
    caption: 'Giao diện tạo QR VietQR trên QR Tools',
  },
  {
    slug: 'tao-ma-qr-wifi',
    url: `${baseUrl}/?type=wifi&source=landing-wifi`,
    image: 'wifi.png',
    alt: 'Giao diện tạo mã QR WiFi trên QR Tools',
    caption: 'Giao diện tạo QR WiFi trên QR Tools',
  },
  {
    slug: 'tao-ma-qr-tu-excel',
    url: `${baseUrl}/?view=bulk&source=landing-excel`,
    image: 'excel.png',
    alt: 'Giao diện QR Tools sau khi nhập dữ liệu từ Excel hoặc CSV',
    caption: 'Nhập dữ liệu từ Excel/CSV và tạo danh sách QR hàng loạt',
    prepare: async (page) => {
      const textarea = page.locator('textarea').filter({ visible: true }).first();
      await textarea.fill([
        'Sản phẩm 001, https://shop.example.com/san-pham-001',
        'Sản phẩm 002, https://shop.example.com/san-pham-002',
        'Sản phẩm 003, https://shop.example.com/san-pham-003',
        'Sản phẩm 004, https://shop.example.com/san-pham-004',
      ].join('\\n'));
      await page.getByRole('button', { name: 'Nhập dữ liệu', exact: true }).click();
      await page.waitForTimeout(800);
    },
  },
  {
    slug: 'in-nhieu-ma-qr-tu-excel',
    url: `${baseUrl}/?view=bulk&source=landing-print-excel`,
    image: 'print-excel.png',
    alt: 'Giao diện QR Tools với định dạng in nhiều mã QR từ Excel',
    caption: 'Chọn định dạng in cho nhiều mã QR từ dữ liệu Excel/CSV',
    prepare: async (page) => {
      const textarea = page.locator('textarea').first();
      await textarea.fill([
        'Sản phẩm 001, https://shop.example.com/san-pham-001',
        'Sản phẩm 002, https://shop.example.com/san-pham-002',
        'Sản phẩm 003, https://shop.example.com/san-pham-003',
        'Sản phẩm 004, https://shop.example.com/san-pham-004',
        'Sản phẩm 005, https://shop.example.com/san-pham-005',
        'Sản phẩm 006, https://shop.example.com/san-pham-006',
      ].join('\\n'));
      await page.getByRole('button', { name: 'Nhập dữ liệu', exact: true }).click();
      await page.waitForTimeout(800);
      await page.getByText('Lưới tem dán', { exact: true }).click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /In trang/ }).click();
      await page.waitForTimeout(1_000);
    },
  },
  {
    slug: 'tao-ma-qr-hang-loat',
    url: `${baseUrl}/?view=bulk&source=landing-bulk`,
    image: 'bulk.png',
    alt: 'Giao diện QR Tools tạo QR hàng loạt bằng đánh số tự động',
    caption: 'Tạo QR hàng loạt với tính năng tự động đánh số',
    prepare: async (page) => {
      await page.getByRole('button', { name: 'Tự động đánh số bàn', exact: true }).click();
      await page.waitForTimeout(800);
    },
  },
];

const guideCaptures = [
  { image: 'generator-url.png', url: `${baseUrl}/?type=url&source=guide-url`, alt: 'QR Tools tạo mã QR URL', caption: 'Generator — tạo QR URL' },
  { image: 'generator-wifi.png', url: `${baseUrl}/?type=wifi&source=guide-wifi`, alt: 'QR Tools tạo mã QR WiFi', caption: 'Generator — tạo QR WiFi' },
  { image: 'generator-contact.png', url: `${baseUrl}/?type=contact&source=guide-contact`, alt: 'QR Tools tạo mã QR thông tin liên hệ', caption: 'Generator — tạo QR Contact / vCard' },
  { image: 'generator-payment.png', url: `${baseUrl}/?type=payment&source=guide-payment`, alt: 'QR Tools tạo mã QR thanh toán VietQR', caption: 'Generator — tạo QR thanh toán VietQR' },
  {
    image: 'customize.png', url: `${baseUrl}/?type=url&source=guide-customize`,
    alt: 'QR Tools tùy chỉnh thiết kế QR', caption: 'Tùy chỉnh — màu, hình dạng và khung',
    prepare: async (page) => {
      await page.getByText('Tùy chỉnh & Khung', { exact: true }).click();
      await page.getByRole('button', { name: 'Bo tròn', exact: true }).first().click();
      await page.getByRole('button', { name: 'Thanh dưới', exact: true }).click();
      await page.getByText('VietQR Marine', { exact: true }).click();
      await page.waitForTimeout(500);
    },
  },
  {
    image: 'templates.png', url: `${baseUrl}/?type=url&source=guide-templates`,
    alt: 'QR Tools quản lý template thiết kế', caption: 'Templates — lưu và tái sử dụng thiết kế',
    prepare: async (page) => {
      await page.getByRole('button', { name: /Mẫu/ }).first().click();
      await page.waitForTimeout(500);
    },
  },
  {
    image: 'history.png', url: `${baseUrl}/?type=payment&source=guide-history`,
    alt: 'QR Tools lịch sử QR', caption: 'History — tìm kiếm, lọc và khôi phục QR',
    prepare: async (page) => {
      await page.getByText('Lịch sử', { exact: true }).click();
      await page.waitForTimeout(500);
    },
  },
  {
    image: 'scanner.png', url: `${baseUrl}/?type=url&source=guide-scanner`,
    alt: 'QR Tools Scanner', caption: 'Scanner — quét và giải mã QR',
    prepare: async (page) => {
      await page.getByText('Scanner', { exact: true }).click();
      await page.waitForTimeout(500);
    },
  },
  { image: 'bulk-overview.png', url: `${baseUrl}/?view=bulk&source=guide-bulk`, alt: 'QR Tools tạo hàng loạt', caption: 'Batch — quản lý nhiều QR' },
  {
    image: 'bulk-import.png', url: `${baseUrl}/?view=bulk&source=guide-import`,
    alt: 'QR Tools import Excel CSV', caption: 'Import — đưa dữ liệu Excel/CSV vào Batch',
    prepare: async (page) => {
      const textarea = page.locator('textarea').first();
      await textarea.fill([
        'Bàn 01 - Tầng 1, https://menu.cafe.vn/table/01',
        'Bàn 02 - Tầng 1, https://menu.cafe.vn/table/02',
        'Bàn 03 - Tầng 1, https://menu.cafe.vn/table/03',
        'Bàn 04 - Tầng 1, https://menu.cafe.vn/table/04',
        'Bàn 05 - Tầng 1, https://menu.cafe.vn/table/05',
      ].join('\\n'));
      await page.getByRole('button', { name: 'Nhập dữ liệu', exact: true }).click();
      await page.waitForTimeout(700);
    },
  },
  {
    image: 'bulk-sequence.png', url: `${baseUrl}/?view=bulk&source=guide-sequence`,
    alt: 'QR Tools tự động đánh số bàn', caption: 'Auto-sequencer — tạo QR bàn tự động',
    prepare: async (page) => {
      await page.getByRole('button', { name: 'Tự động đánh số bàn', exact: true }).click();
      await page.waitForTimeout(500);
    },
  },
  {
    image: 'print-workshop.png', url: `${baseUrl}/?view=bulk&source=guide-print`,
    alt: 'QR Tools Print Workshop A4', caption: 'Print Workshop — thẻ để bàn và lưới nhãn dán A4',
    prepare: async (page) => {
      const textarea = page.locator('textarea').first();
      await textarea.fill([
        'Bàn 01, https://menu.cafe.vn/table/01',
        'Bàn 02, https://menu.cafe.vn/table/02',
        'Bàn 03, https://menu.cafe.vn/table/03',
        'Bàn 04, https://menu.cafe.vn/table/04',
        'Bàn 05, https://menu.cafe.vn/table/05',
        'Bàn 06, https://menu.cafe.vn/table/06',
      ].join('\\n'));
      await page.getByRole('button', { name: 'Nhập dữ liệu', exact: true }).click();
      await page.waitForTimeout(700);
      await page.getByRole('button', { name: /In trang/ }).click();
      await page.waitForTimeout(1200);
      await page.getByText('Lưới nhãn dán', { exact: true }).click();
      await page.waitForTimeout(700);
    },
  },
];

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

async function dismissBlockingOverlays(page) {
  await page.keyboard.press('Escape').catch(() => {});
  const overlays = page.locator('div.fixed.inset-0.z-50');
  const count = await overlays.count();
  for (let index = count - 1; index >= 0; index -= 1) {
    const overlay = overlays.nth(index);
    if (!(await overlay.isVisible().catch(() => false))) continue;

    // The Pro modal's close control is an icon-only button with no accessible
    // name/text/title, so a text-filtered role lookup cannot find it.
    const closeButton = overlay.locator('button').first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click().catch(() => {});
    } else {
      await page.keyboard.press('Escape').catch(() => {});
    }

    await overlay.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  }

  const remaining = page.locator('div.fixed.inset-0.z-50');
  for (let index = 0; index < await remaining.count(); index += 1) {
    if (await remaining.nth(index).isVisible().catch(() => false)) {
      throw new Error('A blocking modal overlay is still visible before the next interaction.');
    }
  }
}

async function capture(page, item) {
  const response = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  if (!response || !response.ok()) throw new Error(`${item.url} returned HTTP ${response?.status() ?? 'unknown'}`);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2_000);
  await dismissBlockingOverlays(page);
  if (item.prepare) await item.prepare(page);
  await page.screenshot({ path: path.join(outputDir, item.image), fullPage: false, animations: 'disabled', scale: 'css' });
}

async function updateLandingPage(item) {
  const filePath = path.join(root, 'public', item.slug, 'index.html');
  let html = await fs.readFile(filePath, 'utf8');
  const figure = `<figure class="landing-screenshot"><img src="/screenshots/landing/${item.image}" alt="${escapeHtml(item.alt)}" loading="lazy" width="1440" height="900"><figcaption>${escapeHtml(item.caption)}</figcaption></figure>`;
  const existingStart = html.indexOf('<figure class="landing-screenshot">');
  if (existingStart !== -1) {
    const existingEnd = html.indexOf('</figure>', existingStart);
    if (existingEnd === -1) throw new Error(`Unclosed landing screenshot figure in ${filePath}`);
    html = html.slice(0, existingStart) + html.slice(existingEnd + '</figure>'.length);
  }
  const marker = '</section><section class="section">';
  if (!html.includes(marker)) throw new Error(`Cannot find screenshot insertion point in ${filePath}`);
  html = html.replace(marker, `</section>${figure}<section class="section">`);
  await fs.writeFile(filePath, html);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await context.addInitScript(({ deviceId }) => { localStorage.setItem('qr_tools_device_id', deviceId); }, { deviceId: proDeviceId });
const page = await context.newPage();

async function activatePro() {
  console.log('Activating Pro for screenshot capture...');
  await dismissBlockingOverlays(page);
  const proButton = page.getByRole('button', { name: 'Pro', exact: true });
  await proButton.waitFor({ state: 'visible', timeout: 10_000 });
  await proButton.click();
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.fill(proEmail);
  const licenseInput = page.getByPlaceholder('License Key', { exact: true });
  await licenseInput.fill(proKey);
  await page.getByRole('button', { name: 'Kích hoạt', exact: true }).click();
  await page.waitForFunction(() => localStorage.getItem('qr_tools_pro') === 'true' && Boolean(localStorage.getItem('qr_tools_activation_token')), undefined, { timeout: 15_000 });
  await page.getByText('Pro đang hoạt động', { exact: true }).waitFor({ state: 'visible', timeout: 5_000 });
  console.log('Pro activation succeeded.');
}

try {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(root, 'public', 'screenshots', 'guide'), { recursive: true });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1_000);
  await dismissBlockingOverlays(page);

  await page.getByRole('button', { name: 'Pro', exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(root, 'public', 'screenshots', 'guide', 'pro-pricing.png'), fullPage: false, animations: 'disabled', scale: 'css' });
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
  await dismissBlockingOverlays(page);
  await activatePro(page);

  for (const item of guideCaptures) {
    console.log(`Capturing guide ${item.image}...`);
    await capture(page, item);
    await fs.rename(path.join(outputDir, item.image), path.join(root, 'public', 'screenshots', 'guide', item.image));
  }

  for (const item of captures) {
    console.log(`Capturing ${item.slug}...`);
    await capture(page, item);
    await updateLandingPage(item);
    console.log(`Updated ${item.slug} with ${item.image}`);
  }
} finally {
  await browser.close();
}
