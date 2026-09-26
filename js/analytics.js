/* VietSofts analytics helpers for QR Code Generator.
 * Sends custom events to any existing GA4 gtag/dataLayer and keeps
 * the legacy Universal Analytics event for compatibility.
 */
(function (window) {
  'use strict';

  window.dataLayer = window.dataLayer || [];

  function track(name, params) {
    params = params || {};

    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params);
    }

    window.dataLayer.push(Object.assign({
      event: name
    }, params));

    if (typeof window.ga === 'function') {
      window.ga('send', 'event', 'qr_tool', name, params.qr_type || '');
    }
  }

  window.vietsoftAnalytics = {
    track: track
  };
})(window);
