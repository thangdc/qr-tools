type EventParams = Record<string, unknown>;

let initialized = false;
let measurementId = '';

function isDevelopmentHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
}

function resolveMeasurementId(): string {
  if (typeof window === 'undefined') return '';
  if (isDevelopmentHost(window.location.hostname)) return '';
  return import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-2S8WCS3WBQ';
}

export function initAnalytics(): void {
  if (initialized || typeof window === 'undefined') return;
  measurementId = resolveMeasurementId();
  if (!measurementId) return;
  initialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    anonymize_ip: true,
    send_page_view: true,
  });
}

export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window === 'undefined') return;
  if (!initialized) initAnalytics();
  if (!initialized || !measurementId) return;
  window.gtag?.('event', name, params);
}

export function trackPurchase(params: {
  transactionId: string;
  value: number;
  plan: string;
  currency?: string;
}): void {
  trackEvent('purchase', {
    transaction_id: params.transactionId,
    value: params.value,
    currency: params.currency || 'VND',
    items: [{
      item_id: `pro_${params.plan}`,
      item_name: `QR Tools Pro ${params.plan}`,
      price: params.value,
      quantity: 1,
    }],
  });
}
