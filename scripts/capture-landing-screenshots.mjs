import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outputDir = path.join(root, 'public', 'screenshots', 'landing');
const baseUrl = 'https://qr.thangdc.com';

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
    alt: 'Giao diện Hàng loạt và Xuất của QR Tools cho workflow Excel',
    caption: 'Workflow Hàng loạt & Xuất dành cho dữ liệu Excel/CSV',
  },
  {
    slug: 'in-nhieu-ma-qr-tu-excel',
    url: `${baseUrl}/?view=bulk&source=landing-print-excel`,
    image: 'print-excel.png',
    alt: 'Giao diện QR Tools cho workflow in nhiều mã QR từ Excel',
    caption: 'Workflow Hàng loạt & Xuất cho nhu cầu in nhiều QR',
  },
  {
    slug: 'tao-ma-qr-hang-loat',
    url: `${baseUrl}/?view=bulk&source=landing-bulk`,
    image: 'bulk.png',
    alt: 'Giao diện tạo và quản lý QR hàng loạt trên QR Tools',
    caption: 'Giao diện tạo và quản lý QR hàng loạt',
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
const page = await context.newPage();

try {
  await fs.mkdir(outputDir, { recursive: true });

  for (const item of captures) {
    console.log(`Capturing ${item.slug}...`);
    await capture(page, item);
    await updateLandingPage(item);
    console.log(`Updated ${item.slug} with ${item.image}`);
  }
} finally {
  await browser.close();
}
