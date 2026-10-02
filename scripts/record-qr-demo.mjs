import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.QR_TOOLS_URL || 'https://qr.thangdc.com';
const proEmail = process.env.QR_PRO_EMAIL || '';
const proKey = process.env.QR_PRO_KEY || '';
const outputDir = path.resolve(process.env.QR_VIDEO_OUTPUT || 'artifacts/qr-demo');
if (!proEmail || !proKey) throw new Error('QR_PRO_EMAIL and QR_PRO_KEY are required.');

const rooms = [
  ['Phòng 101','https://qr.thangdc.com/room/101'],['Phòng 102','https://qr.thangdc.com/room/102'],
  ['Phòng 103','https://qr.thangdc.com/room/103'],['Phòng 201','https://qr.thangdc.com/room/201'],
  ['Phòng 202','https://qr.thangdc.com/room/202'],['Phòng 203','https://qr.thangdc.com/room/203'],
  ['Phòng 301','https://qr.thangdc.com/room/301'],['Phòng 302','https://qr.thangdc.com/room/302'],
];
const csv=rooms.map(([n,u])=>`${n}, ${u}`).join('\n');
await fs.mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,recordVideo:{dir:path.join(outputDir,'video'),size:{width:1440,height:900}}});
const page=await context.newPage();
const pause=ms=>page.waitForTimeout(ms);
async function dismiss(){await page.keyboard.press('Escape').catch(()=>{});const o=page.locator('div.fixed.inset-0.z-50');for(let i=await o.count()-1;i>=0;i--){const x=o.nth(i);if(!(await x.isVisible().catch(()=>false)))continue;const b=x.locator('button').first();if(await b.isVisible().catch(()=>false))await b.click().catch(()=>{});else await page.keyboard.press('Escape').catch(()=>{});await x.waitFor({state:'hidden',timeout:5000}).catch(()=>{});}}
async function shot(n){await page.screenshot({path:path.join(outputDir,`${n}.png`),fullPage:false,animations:'disabled',scale:'css'});}
async function openHistory(){await page.goto(`${baseUrl}/?view=history&source=video`,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForLoadState('networkidle',{timeout:15000}).catch(()=>{});await pause(1500);await dismiss();await page.getByTestId('nav-history').click().catch(()=>{});await pause(700);await page.getByRole('button',{name:'Import',exact:true}).click();await pause(700);}
async function activate(){await page.getByRole('button',{name:'Pro',exact:true}).click();await pause(700);await page.locator('input[type="email"]').first().fill(proEmail);await page.getByPlaceholder('License Key',{exact:true}).fill(proKey);await page.getByRole('button',{name:'Kích hoạt',exact:true}).click();await page.waitForFunction(()=>localStorage.getItem('qr_tools_pro')==='true',undefined,{timeout:15000});await pause(1000);await dismiss();}
try{
 await page.goto(`${baseUrl}/?view=generator&type=url&source=video`,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForLoadState('networkidle',{timeout:15000}).catch(()=>{});await pause(1800);await dismiss();await shot('01-generator');
 await openHistory();await shot('02-import-empty');await page.locator('textarea').first().fill(csv);await pause(1200);await shot('03-import-data');await page.getByRole('button',{name:'Thêm',exact:true}).click();await pause(700);await page.getByRole('button',{name:/Thêm vào lịch sử/}).click();await pause(1200);await shot('04-history-batch');
 await activate();await page.goto(`${baseUrl}/?view=history&source=video-pro`,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForLoadState('networkidle',{timeout:15000}).catch(()=>{});await pause(1500);await dismiss();await shot('05-pro-history');
 await page.getByRole('button',{name:/Xuất & in tất cả/}).click();await pause(1200);await shot('06-print-workshop');const sticker=page.getByText('Lưới nhãn dán',{exact:true});if(await sticker.isVisible().catch(()=>false)){await sticker.click();await pause(900);await shot('07-label-grid');}
 await page.goto(`${baseUrl}/?view=generator&type=url&source=video-free`,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForLoadState('networkidle',{timeout:15000}).catch(()=>{});await pause(1500);await dismiss();const inputs=page.locator('input');for(let i=0;i<await inputs.count();i++){const x=inputs.nth(i);if(await x.isVisible().catch(()=>false)&&await x.isEditable().catch(()=>false)){await x.fill('https://qr.thangdc.com/');break;}}await pause(1000);await shot('08-free-generator');const d=page.getByRole('button',{name:/Download PNG|Tải PNG/i}).first();if(await d.isVisible().catch(()=>false)){await d.click().catch(()=>{});await pause(800);}await shot('09-free-download');
 console.log(JSON.stringify({success:true,rows:rooms.length,outputDir},null,2));
}finally{await context.close();await browser.close();}
