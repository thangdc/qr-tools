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
      await page.getByText('Lưới tem dán', { exact: true }).click();
      await page.waitForTimeout(500);
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

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

async function capture(page, item) {
  const response = await page.goto(item.url, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });

  if (!response || !response.ok()) {
    throw new Error(`${item.url} returned HTTP ${response?.status() ?? 'unknown'}`);
  }

  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2_000);
  await page.keyboard.press('Escape').catch(() => {});

  if (item.prepare) {
    await item.prepare(page);
  }

  await page.screenshot({
    path: path.join(outputDir, item.image),
    fullPage: false,
    animations: 'disabled',
    scale: 'css',
  });
}

async function updateLandingPage(item) {
  const filePath = path.join(root, 'public', item.slug, 'index.html');
  let html = await fs.readFile(filePath, 'utf8');

  const figure = `<figure class="landing-screenshot"><img src="/screenshots/landing/${item.image}" alt="${escapeHtml(item.alt)}" loading="lazy" width="1440" height="900"><figcaption>${escapeHtml(item.caption)}</figcaption></figure>`;

  const existingStart = html.indexOf('<figure class="landing-screenshot">');
  if (existingStart !== -1) {
    const existingEnd = html.indexOf('</figure>', existingStart);
    if (existingEnd === -1) {
      throw new Error(`Unclosed landing screenshot figure in ${filePath}`);
    }
    html = html.slice(0, existingStart) + html.slice(existingEnd + '</figure>'.length);
  }

  const marker = '</section><section class="section">';
  if (!html.includes(marker)) {
    throw new Error(`Cannot find screenshot insertion point in ${filePath}`);
  }

  html = html.replace(marker, `</section>${figure}<section class="section">`);
  await fs.writeFile(filePath, html);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
await context.addInitScript(({ deviceId }) => {
  localStorage.setItem('qr_tools_device_id', deviceId);
}, { deviceId: proDeviceId });
const page = await context.newPage();

async function activatePro() {
  console.log('Activating Pro for screenshot capture...');
  await page.getByRole('button', { name: 'Pro', exact: true }).click();
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.fill(proEmail);
  const licenseInput = page.getByPlaceholder('License Key', { exact: true });
  await licenseInput.fill(proKey);
  await page.getByRole('button', { name: 'Kích hoạt', exact: true }).click();
  await page.waitForTimeout(1_500);

  const activationMessage = page.getByText('Pro đã được kích hoạt trên thiết bị này.', { exact: true });
  await activationMessage.waitFor({ state: 'visible', timeout: 15_000 });
  console.log('Pro activation succeeded.');
}

try {
  await fs.mkdir(outputDir, { recursive: true });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1_000);
  await activatePro();

  for (const item of captures) {
    console.log(`Capturing ${item.slug}...`);
    await capture(page, item);
    await updateLandingPage(item);
    console.log(`Updated ${item.slug} with ${item.image}`);
  }
} finally {
  await browser.close();
}
