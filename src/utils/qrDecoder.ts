import jsQR from 'jsqr';
import { DecodedQRData, QRType, QRFormData } from '../types/qr';
import { VIETNAM_BANKS } from './vietqr';

interface NativeBarcodeDetector {
  detect(source: ImageBitmap | HTMLImageElement | Blob): Promise<Array<{ rawValue?: string }>>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => NativeBarcodeDetector;
  }
}

export async function scanImageFile(file: File): Promise<string | null> {
  // Prefer the browser's native QR detector when available. It is more
  // tolerant of real screenshots/photos and styled QR codes than jsQR alone.
  if (typeof window !== 'undefined' && window.BarcodeDetector) {
    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const results = await detector.detect(file);
      const value = results.find((result) => result.rawValue)?.rawValue;
      if (value) return value;

      if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(file);
        try {
          const bitmapResults = await detector.detect(bitmap);
          const bitmapValue = bitmapResults.find((result) => result.rawValue)?.rawValue;
          if (bitmapValue) return bitmapValue;
        } finally {
          bitmap.close();
        }
      }
    } catch (error) {
      console.warn('Native QR detection failed; falling back to jsQR.', error);
    }
  }

  const imageUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = imageUrl;
    try {
      await image.decode();
    } catch {
      return null;
    }
    const maxDimension = 1800;
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const resize = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * resize));
    canvas.height = Math.max(1, Math.round(sourceHeight * resize));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const fullResult = scanImageData(imageData);
    if (fullResult) return fullResult;

    // QR Tools templates can place the QR inside a card/frame. Scan the center
    // regions separately so a relatively small QR is not lost in surrounding UI.
    const regions = [0.82, 0.68, 0.55];
    for (const ratio of regions) {
      const cropWidth = Math.round(canvas.width * ratio);
      const cropHeight = Math.round(canvas.height * ratio);
      const cropX = Math.round((canvas.width - cropWidth) / 2);
      const cropY = Math.round((canvas.height - cropHeight) / 2);
      const crop = ctx.getImageData(cropX, cropY, cropWidth, cropHeight);
      const result = scanImageData(crop);
      if (result) return result;
    }

    return null;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

/**
 * Scan imageData using jsQR
 */
export function scanImageData(imageData: ImageData, options: { enhanced?: boolean } = {}): string | null {
  const decode = (data: ImageData) =>
    jsQR(data.data, data.width, data.height, {
      inversionAttempts: 'attemptBoth',
    })?.data ?? null;

  // First try the source image unchanged.
  const direct = decode(imageData);
  if (direct) return direct;

  if (options.enhanced === false) return null;

  // QR codes embedded in screenshots/photos can be too small for jsQR.
  // Upscale and retry with grayscale + contrast normalization.
  const scale = imageData.width < 800 || imageData.height < 800 ? 3 : 2;
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width * scale;
  canvas.height = imageData.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = imageData.width;
  sourceCanvas.height = imageData.height;
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) return null;

  sourceCtx.putImageData(imageData, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

  const upscaled = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const upscaledResult = decode(upscaled);
  if (upscaledResult) return upscaledResult;

  // Normalize luminance and contrast for compressed/low-contrast images.
  const pixels = upscaled.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const luminance = Math.round(
      pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
    );
    const value = luminance < 128 ? 0 : 255;
    pixels[i] = value;
    pixels[i + 1] = value;
    pixels[i + 2] = value;
  }

  return decode(upscaled);
}

/**
 * Parse raw QR payload string into recognized QR types and form data
 */
export function parseRawQRPayload(raw: string): DecodedQRData {
  const clean = raw.trim();

  // 1. Check VietQR EMVCo Napas 247 payload
  if (clean.startsWith('000201') && clean.includes('A000000727')) {
    // Parse Tag 38 for Napas BIN and Account No
    let bankBin = '970436';
    let accountNumber = '';
    let accountName = '';
    let amount = '';
    let description = '';

    // Extract Tag 38 (Consumer account info)
    const tag38Match = clean.match(/38\d{2}(.*?)(?:5303|5802)/);
    if (tag38Match) {
      const sub00Match = tag38Match[1].match(/0006(\d{6})/);
      if (sub00Match) bankBin = sub00Match[1];
      const sub01Match = tag38Match[1].match(/01(\d{2})([A-Za-z0-9]+)/);
      if (sub01Match) accountNumber = sub01Match[2];
    }

    // Extract Tag 54 (Amount)
    const amountMatch = clean.match(/54(\d{2})(\d+)/);
    if (amountMatch) {
      const len = parseInt(amountMatch[1], 10);
      amount = amountMatch[2].slice(0, len);
    }

    // Extract Tag 59 (Account name)
    const nameMatch = clean.match(/59(\d{2})(.*?)(?:6002|62)/);
    if (nameMatch) {
      const len = parseInt(nameMatch[1], 10);
      accountName = nameMatch[2].slice(0, len);
    }

    // Extract Tag 62 (Additional data / Description)
    const tag62Match = clean.match(/62\d{2}.*?08(\d{2})(.*?)(?:6304|$)/);
    if (tag62Match) {
      const len = parseInt(tag62Match[1], 10);
      description = tag62Match[2].slice(0, len);
    }

    const bank = VIETNAM_BANKS.find((b) => b.bin === bankBin) || VIETNAM_BANKS[0];

    return {
      raw: clean,
      type: 'payment',
      title: `${bank.shortName} · ${accountNumber || 'Tài khoản ngân hàng'}`,
      subtitle: `${accountName || 'Chủ TK'} · ${amount ? `${Number(amount).toLocaleString('vi-VN')} ₫` : 'Linh hoạt'}`,
      parsedData: {
        bankBin,
        bankName: bank.shortName,
        accountNumber,
        accountName,
        amount,
        description,
      } as QRFormData['payment'],
    };
  }

  // 2. Check WiFi (WIFI:T:...;S:...;P:...;;)
  if (/^WIFI:/i.test(clean)) {
    const ssidMatch = clean.match(/S:([^;]+)/);
    const passMatch = clean.match(/P:([^;]+)/);
    const secMatch = clean.match(/T:([^;]+)/);
    const hiddenMatch = clean.match(/H:([^;]+)/);

    const ssid = ssidMatch ? ssidMatch[1] : '';
    const password = passMatch ? passMatch[1] : '';
    const security = (secMatch ? secMatch[1].toUpperCase() : 'WPA') as any;
    const hidden = hiddenMatch ? hiddenMatch[1].toLowerCase() === 'true' : false;

    return {
      raw: clean,
      type: 'wifi',
      title: `WiFi: ${ssid || 'Mạng Wi-Fi'}`,
      subtitle: `${security} bảo mật · ${password ? 'Có mật khẩu' : 'Mở'}`,
      parsedData: {
        ssid,
        password,
        security,
        hidden,
      } as QRFormData['wifi'],
    };
  }

  // 3. Check vCard Contact
  if (/^BEGIN:VCARD/i.test(clean)) {
    const fnMatch = clean.match(/FN:(.+?)(?:\r?\n|$)/i);
    const telMatch = clean.match(/TEL.*?:(.+?)(?:\r?\n|$)/i);
    const emailMatch = clean.match(/EMAIL.*?:(.+?)(?:\r?\n|$)/i);
    const orgMatch = clean.match(/ORG:(.+?)(?:\r?\n|$)/i);
    const urlMatch = clean.match(/URL:(.+?)(?:\r?\n|$)/i);
    const adrMatch = clean.match(/ADR.*?:(?:;;)?(.+?)(?:;;;*)?(?:\r?\n|$)/i);

    const fullName = fnMatch ? fnMatch[1].trim() : 'Danh bạ';
    const names = fullName.split(' ');
    const firstName = names[0] || '';
    const lastName = names.slice(1).join(' ') || '';

    return {
      raw: clean,
      type: 'contact',
      title: fullName,
      subtitle: (orgMatch && orgMatch[1]) || (telMatch && telMatch[1]) || 'vCard Contact',
      parsedData: {
        firstName,
        lastName,
        phone: telMatch ? telMatch[1].trim() : '',
        email: emailMatch ? emailMatch[1].trim() : '',
        organization: orgMatch ? orgMatch[1].trim() : '',
        website: urlMatch ? urlMatch[1].trim() : '',
        address: adrMatch ? adrMatch[1].replace(/;/g, ' ').trim() : '',
      } as QRFormData['contact'],
    };
  }

  // 4. Check Email (mailto:...)
  if (/^mailto:/i.test(clean)) {
    const withoutPrefix = clean.replace(/^mailto:/i, '');
    const [emailPart, queryPart] = withoutPrefix.split('?');
    const params = new URLSearchParams(queryPart || '');

    return {
      raw: clean,
      type: 'email',
      title: emailPart || 'Email',
      subtitle: params.get('subject') ? `Chủ đề: ${params.get('subject')}` : 'Gửi thư',
      parsedData: {
        email: emailPart || '',
        subject: params.get('subject') || '',
        message: params.get('body') || '',
      } as QRFormData['email'],
    };
  }

  // 5. Check Phone (tel:...)
  if (/^tel:/i.test(clean)) {
    const phone = clean.replace(/^tel:/i, '').trim();
    return {
      raw: clean,
      type: 'phone',
      title: phone,
      subtitle: 'Số điện thoại gọi nhanh',
      parsedData: { phone } as QRFormData['phone'],
    };
  }

  // 6. Check SMS (smsto:... or sms:...)
  if (/^(smsto|sms):/i.test(clean)) {
    const parts = clean.replace(/^(smsto|sms):/i, '').split(':');
    const phone = parts[0] || '';
    const message = parts.slice(1).join(':') || '';
    return {
      raw: clean,
      type: 'sms',
      title: `SMS tới ${phone}`,
      subtitle: message || 'Tin nhắn',
      parsedData: { phone, message } as QRFormData['sms'],
    };
  }

  // 7. Check Location (geo:... or maps url)
  if (/^geo:/i.test(clean)) {
    const coordsMatch = clean.replace(/^geo:/i, '').match(/^([-\d.]+),([-\d.]+)(?:\?q=(.*))?/);
    const latitude = coordsMatch ? coordsMatch[1] : '';
    const longitude = coordsMatch ? coordsMatch[2] : '';
    const locationName = coordsMatch && coordsMatch[3] ? decodeURIComponent(coordsMatch[3]) : 'Tọa độ GPS';

    return {
      raw: clean,
      type: 'location',
      title: locationName,
      subtitle: `${latitude}, ${longitude}`,
      parsedData: {
        latitude,
        longitude,
        locationName,
      } as QRFormData['location'],
    };
  }

  // 8. Check URL (http:// or https://)
  if (/^https?:\/\//i.test(clean)) {
    let hostname = clean;
    try {
      hostname = new URL(clean).hostname;
    } catch {}

    return {
      raw: clean,
      type: 'url',
      title: hostname,
      subtitle: clean,
      parsedData: { url: clean } as QRFormData['url'],
    };
  }

  // 9. Default to Plain Text
  return {
    raw: clean,
    type: 'text',
    title: clean.slice(0, 36) || 'Văn bản thuần túy',
    subtitle: `${clean.length} ký tự`,
    parsedData: { text: clean } as QRFormData['text'],
  };
}
