import { QRType, QRFormData } from '../types/qr';
import { buildVietQRPayload } from './vietqr';

export function generatePayload(type: QRType, data: QRFormData[QRType]): string {
  switch (type) {
    case 'url': {
      const url = (data as QRFormData['url']).url?.trim() || '';
      if (!url) return '';
      if (!/^https?:\/\//i.test(url) && !url.startsWith('//')) {
        return `https://${url}`;
      }
      return url;
    }

    case 'text': {
      return (data as QRFormData['text']).text || '';
    }

    case 'contact': {
      const c = data as QRFormData['contact'];
      if (!c.firstName && !c.lastName && !c.phone && !c.email) return '';
      // vCard 3.0 specification
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${c.lastName || ''};${c.firstName || ''};;;`,
        `FN:${[c.firstName, c.lastName].filter(Boolean).join(' ')}`,
        c.organization ? `ORG:${c.organization}` : '',
        c.phone ? `TEL;TYPE=CELL:${c.phone}` : '',
        c.email ? `EMAIL;TYPE=INTERNET:${c.email}` : '',
        c.website ? `URL:${c.website}` : '',
        c.address ? `ADR;TYPE=WORK:;;${c.address};;;;` : '',
        'END:VCARD',
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'wifi': {
      const w = data as QRFormData['wifi'];
      if (!w.ssid) return '';
      const sec = w.security || 'WPA';
      const hidden = w.hidden ? 'true' : 'false';
      // Escaping special characters in SSID & password for WiFi QR
      const escape = (val: string) => val.replace(/([\\;,:"])/g, '\\$1');
      return `WIFI:T:${sec};S:${escape(w.ssid)};P:${escape(w.password || '')};H:${hidden};;`;
    }

    case 'email': {
      const e = data as QRFormData['email'];
      if (!e.email) return '';
      const params = new URLSearchParams();
      if (e.subject) params.append('subject', e.subject);
      if (e.message) params.append('body', e.message);
      const query = params.toString();
      return `mailto:${e.email}${query ? `?${query}` : ''}`;
    }

    case 'phone': {
      const p = data as QRFormData['phone'];
      if (!p.phone) return '';
      return `tel:${p.phone.trim().replace(/\s+/g, '')}`;
    }

    case 'sms': {
      const s = data as QRFormData['sms'];
      if (!s.phone) return '';
      return `smsto:${s.phone.trim().replace(/\s+/g, '')}:${s.message || ''}`;
    }

    case 'location': {
      const l = data as QRFormData['location'];
      if (!l.latitude && !l.longitude) return '';
      const lat = l.latitude.trim();
      const lng = l.longitude.trim();
      if (l.locationName) {
        return `geo:${lat},${lng}?q=${encodeURIComponent(l.locationName)}`;
      }
      return `geo:${lat},${lng}`;
    }

    case 'payment': {
      const pay = data as QRFormData['payment'];
      if (!pay.bankBin || !pay.accountNumber) return '';
      return buildVietQRPayload(
        pay.bankBin,
        pay.accountNumber,
        pay.accountName,
        pay.amount,
        pay.description
      );
    }

    case 'event': {
      const ev = data as QRFormData['event'];
      if (!ev.title) return '';
      const formatICSDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };
      const start = formatICSDate(ev.startDate);
      const end = formatICSDate(ev.endDate);
      return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//QR Tools//EN',
        'BEGIN:VEVENT',
        `SUMMARY:${ev.title}`,
        ev.location ? `LOCATION:${ev.location}` : '',
        ev.description ? `DESCRIPTION:${ev.description}` : '',
        start ? `DTSTART:${start}` : '',
        end ? `DTEND:${end}` : '',
        'END:VEVENT',
        'END:VCALENDAR',
      ]
        .filter(Boolean)
        .join('\n');
    }

    default:
      return '';
  }
}

export function getQRSummary(type: QRType, data: QRFormData[QRType]): { title: string; subtitle: string } {
  switch (type) {
    case 'url': {
      const d = data as QRFormData['url'];
      return {
        title: d.url ? (d.url.replace(/^https?:\/\//i, '').replace(/\/$/, '') || 'Website Link') : 'Website URL',
        subtitle: 'Trang web trực tuyến',
      };
    }
    case 'text': {
      const d = data as QRFormData['text'];
      const firstLine = d.text?.trim().split('\n')[0] || '';
      return {
        title: firstLine.slice(0, 35) || 'Văn bản thuần túy',
        subtitle: `${d.text?.length || 0} ký tự`,
      };
    }
    case 'contact': {
      const d = data as QRFormData['contact'];
      const fullName = [d.firstName, d.lastName].filter(Boolean).join(' ') || 'Danh bạ cá nhân';
      return {
        title: fullName,
        subtitle: d.organization || d.phone || d.email || 'vCard Contact',
      };
    }
    case 'wifi': {
      const d = data as QRFormData['wifi'];
      return {
        title: d.ssid ? `WiFi: ${d.ssid}` : 'Mạng WiFi',
        subtitle: d.security === 'nopass' ? 'Mạng mở (Không mật khẩu)' : `${d.security} bảo mật`,
      };
    }
    case 'email': {
      const d = data as QRFormData['email'];
      return {
        title: d.email || 'Gửi thư điện tử',
        subtitle: d.subject ? `Chủ đề: ${d.subject}` : 'Email',
      };
    }
    case 'phone': {
      const d = data as QRFormData['phone'];
      return {
        title: d.phone || 'Số điện thoại',
        subtitle: 'Gọi điện nhanh',
      };
    }
    case 'sms': {
      const d = data as QRFormData['sms'];
      return {
        title: d.phone ? `SMS tới ${d.phone}` : 'Tin nhắn SMS',
        subtitle: d.message ? d.message.slice(0, 30) : 'Nội dung tin nhắn',
      };
    }
    case 'location': {
      const d = data as QRFormData['location'];
      return {
        title: d.locationName || `${d.latitude}, ${d.longitude}` || 'Tọa độ GPS',
        subtitle: 'Vị trí bản đồ',
      };
    }
    case 'payment': {
      const d = data as QRFormData['payment'];
      const amountStr = d.amount ? `${Number(d.amount).toLocaleString('vi-VN')} đ` : 'Chuyển khoản linh hoạt';
      return {
        title: `${d.bankName || 'VietQR'} · ${d.accountNumber || ''}`,
        subtitle: `${d.accountName || 'Chủ tài khoản'} · ${amountStr}`,
      };
    }
    case 'event': {
      const d = data as QRFormData['event'];
      return {
        title: d.title || 'Sự kiện / Lịch hẹn',
        subtitle: d.location || (d.startDate ? new Date(d.startDate).toLocaleDateString() : 'iCalendar Event'),
      };
    }
  }
}
