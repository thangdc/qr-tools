const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-2S8WCS3WBQ';

type EventParams = Record<string, string | number | boolean | undefined>;

let initialized = false;

export function initAnalytics(): void {
  if (initialized || typeof window === 'undefined' || !MEASUREMENT_ID) return;
  initialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: true,
  });
}

export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window === 'undefined') return;
  if (!initialized) initAnalytics();
  window.gtag?.('event', name, params);
}
