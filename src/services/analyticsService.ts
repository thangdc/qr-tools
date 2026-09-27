import { TrackedUrlItem, ScanEvent } from '../types/qr';

const STORAGE_KEY = 'qr_tools_tracked_urls_v1';

const CITIES = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng', 'Nha Trang'];
const DEVICES: ('iOS' | 'Android' | 'Desktop')[] = ['iOS', 'iOS', 'iOS', 'Android', 'Android', 'Desktop'];
const SOURCES = ['Camera Direct Scan', 'Zalo QR Reader', 'Apple Camera App', 'Chrome QR Scan', 'Instagram Camera'];

const getPastDates = (days: number): string[] => {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400 * 1000);
    dates.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  return dates;
};

export const INITIAL_TRACKED_URLS: TrackedUrlItem[] = [
  {
    id: 'track-1',
    title: 'Highlands Coffee - Bàn 01 Menu',
    destinationUrl: 'https://menu.highlandscoffee.vn/table/01',
    trackingSlug: 'hlc-table01',
    shortUrl: 'https://qr.tl/hlc-table01',
    totalScans: 486,
    uniqueScans: 394,
    createdAt: Date.now() - 14 * 86400 * 1000,
    lastScannedAt: Date.now() - 4 * 60 * 1000,
    status: 'active',
    dailyStats: [
      { date: '09/20', scans: 48 },
      { date: '09/21', scans: 62 },
      { date: '09/22', scans: 55 },
      { date: '09/23', scans: 74 },
      { date: '09/24', scans: 88 },
      { date: '09/25', scans: 95 },
      { date: '09/26', scans: 64 },
    ],
    recentScans: [
      {
        id: 'scan-1',
        timestamp: Date.now() - 4 * 60 * 1000,
        device: 'iOS',
        city: 'TP. Hồ Chí Minh',
        source: 'Apple Camera App',
      },
      {
        id: 'scan-2',
        timestamp: Date.now() - 19 * 60 * 1000,
        device: 'Android',
        city: 'TP. Hồ Chí Minh',
        source: 'Zalo QR Reader',
      },
      {
        id: 'scan-3',
        timestamp: Date.now() - 42 * 60 * 1000,
        device: 'iOS',
        city: 'TP. Hồ Chí Minh',
        source: 'Camera Direct Scan',
      },
      {
        id: 'scan-4',
        timestamp: Date.now() - 85 * 60 * 1000,
        device: 'Android',
        city: 'Đà Nẵng',
        source: 'Chrome QR Scan',
      },
    ],
  },
  {
    id: 'track-2',
    title: 'Summer Sale 2026 Poster',
    destinationUrl: 'https://shop.brand.vn/summer-sale?utm_source=qr&utm_medium=poster',
    trackingSlug: 'summer-sale',
    shortUrl: 'https://qr.tl/summer-sale',
    totalScans: 1240,
    uniqueScans: 980,
    createdAt: Date.now() - 20 * 86400 * 1000,
    lastScannedAt: Date.now() - 15 * 60 * 1000,
    status: 'active',
    dailyStats: [
      { date: '09/20', scans: 140 },
      { date: '09/21', scans: 175 },
      { date: '09/22', scans: 160 },
      { date: '09/23', scans: 198 },
      { date: '09/24', scans: 220 },
      { date: '09/25', scans: 215 },
      { date: '09/26', scans: 132 },
    ],
    recentScans: [
      {
        id: 'scan-21',
        timestamp: Date.now() - 15 * 60 * 1000,
        device: 'iOS',
        city: 'Hà Nội',
        source: 'Instagram Camera',
      },
      {
        id: 'scan-22',
        timestamp: Date.now() - 34 * 60 * 1000,
        device: 'iOS',
        city: 'TP. Hồ Chí Minh',
        source: 'Camera Direct Scan',
      },
    ],
  },
  {
    id: 'track-3',
    title: 'Grand Opening Invitation Card',
    destinationUrl: 'https://event.cafe.vn/invitation',
    trackingSlug: 'grand-opening',
    shortUrl: 'https://qr.tl/grand-opening',
    totalScans: 310,
    uniqueScans: 275,
    createdAt: Date.now() - 5 * 86400 * 1000,
    lastScannedAt: Date.now() - 58 * 60 * 1000,
    status: 'active',
    dailyStats: [
      { date: '09/20', scans: 12 },
      { date: '09/21', scans: 35 },
      { date: '09/22', scans: 60 },
      { date: '09/23', scans: 78 },
      { date: '09/24', scans: 54 },
      { date: '09/25', scans: 41 },
      { date: '09/26', scans: 30 },
    ],
    recentScans: [
      {
        id: 'scan-31',
        timestamp: Date.now() - 58 * 60 * 1000,
        device: 'Android',
        city: 'Hà Nội',
        source: 'Zalo QR Reader',
      },
    ],
  },
  {
    id: 'track-4',
    title: 'Quầy Thu Ngân 01 - Đánh giá dịch vụ',
    destinationUrl: 'https://survey.feedback.vn/quyen-thu-ngan-01',
    trackingSlug: 'feedback-c01',
    shortUrl: 'https://qr.tl/feedback-c01',
    totalScans: 154,
    uniqueScans: 142,
    createdAt: Date.now() - 8 * 86400 * 1000,
    lastScannedAt: Date.now() - 110 * 60 * 1000,
    status: 'active',
    dailyStats: [
      { date: '09/20', scans: 18 },
      { date: '09/21', scans: 22 },
      { date: '09/22', scans: 19 },
      { date: '09/23', scans: 25 },
      { date: '09/24', scans: 28 },
      { date: '09/25', scans: 24 },
      { date: '09/26', scans: 18 },
    ],
    recentScans: [
      {
        id: 'scan-41',
        timestamp: Date.now() - 110 * 60 * 1000,
        device: 'iOS',
        city: 'TP. Hồ Chí Minh',
        source: 'Apple Camera App',
      },
    ],
  },
];

export class AnalyticsService {
  public static loadTrackedUrls(): TrackedUrlItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_TRACKED_URLS;
  }

  public static saveTrackedUrls(items: TrackedUrlItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
  }

  public static simulateScanEvent(item: TrackedUrlItem): TrackedUrlItem {
    const randomDevice = DEVICES[Math.floor(Math.random() * DEVICES.length)];
    const randomCity = CITIES[Math.floor(Math.random() * CITIES.length)];
    const randomSource = SOURCES[Math.floor(Math.random() * SOURCES.length)];

    const newScan: ScanEvent = {
      id: `scan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      device: randomDevice,
      city: randomCity,
      source: randomSource,
    };

    const todayDate = new Date();
    const todayStr = `${todayDate.getMonth() + 1}/${todayDate.getDate()}`;

    const updatedDaily = [...item.dailyStats];
    const todayIndex = updatedDaily.findIndex((d) => d.date === todayStr);
    if (todayIndex >= 0) {
      updatedDaily[todayIndex] = {
        ...updatedDaily[todayIndex],
        scans: updatedDaily[todayIndex].scans + 1,
      };
    } else {
      updatedDaily.push({ date: todayStr, scans: 1 });
      if (updatedDaily.length > 7) updatedDaily.shift();
    }

    return {
      ...item,
      totalScans: item.totalScans + 1,
      uniqueScans: item.uniqueScans + (Math.random() > 0.3 ? 1 : 0),
      lastScannedAt: Date.now(),
      recentScans: [newScan, ...item.recentScans.slice(0, 9)],
      dailyStats: updatedDaily,
    };
  }

  public static createTrackedUrl(
    title: string,
    destinationUrl: string,
    customSlug?: string
  ): TrackedUrlItem {
    const slug =
      customSlug?.trim() ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 20) ||
      `link-${Math.floor(Math.random() * 10000)}`;

    const dates = getPastDates(7);
    const dailyStats = dates.map((d) => ({ date: d, scans: 0 }));

    return {
      id: `track-${Date.now()}`,
      title: title.trim() || 'New Tracked Link',
      destinationUrl: destinationUrl.trim(),
      trackingSlug: slug,
      shortUrl: `https://qr.tl/${slug}`,
      totalScans: 0,
      uniqueScans: 0,
      createdAt: Date.now(),
      status: 'active',
      dailyStats,
      recentScans: [],
    };
  }

  public static exportCSV(items: TrackedUrlItem[]): void {
    const rows = [
      'Title,Short URL,Destination URL,Total Scans,Unique Visitors,Status,Created Date',
      ...items.map(
        (i) =>
          `"${i.title.replace(/"/g, '""')}","${i.shortUrl}","${i.destinationUrl.replace(/"/g, '""')}",${i.totalScans},${i.uniqueScans},"${i.status}","${new Date(i.createdAt).toLocaleDateString()}"`
      ),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `qr-tracking-analytics-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
