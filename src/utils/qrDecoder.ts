import jsQR from 'jsqr';
import { DecodedQRData, QRType, QRFormData } from '../types/qr';
import { VIETNAM_BANKS } from './vietqr';

/**
 * Scan imageData using jsQR
 */
export function scanImageData(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });
  return code ? code.data : null;
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
