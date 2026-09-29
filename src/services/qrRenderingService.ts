import QRCode from 'qrcode';
import { QRTemplate, QRType, QRDesignOptions } from '../types/qr';
import { renderCustomQRCode } from '../utils/qrRenderer';

export interface QRRenderContextOptions {
  label?: string;
  subtitle?: string;
  type?: QRType;
  wifiSsid?: string;
  wifiPass?: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  amount?: string;
  brandLogoUrl?: string | null;
}

/**
 * Centralized QR Rendering Service
 * Ensures the frame, color palette, logo, patterns, and layout defined in the template
 * are consistently applied across both the main preview, downloads, copy, and the BatchCardPrintModal.
 */
export class QRRenderingService {
  /**
   * Helper to load an image asynchronously
   */
  private static loadImage(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      if (!src) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  /**
   * Render a QR code with the complete template specifications onto a target canvas.
   */
  public static async renderToCanvas(
    canvas: HTMLCanvasElement,
    payload: string,
    template: QRTemplate,
    extra: QRRenderContextOptions = {},
    targetWidth: number = 420
  ): Promise<void> {
    if (!payload || !canvas) return;

    const layout = template.layout;
    const design = this.getEffectiveDesign(template);

    // 1. Bare Layout: Pure QR with custom colors, module shape, eyes, and center logo
    if (layout === 'bare') {
      await renderCustomQRCode(canvas, payload, design, targetWidth);
      return;
    }

    // 2. Framed Layout: QR Code with top or bottom callout banner
    if (layout === 'framed') {
      const framedDesign: QRDesignOptions = {
        ...design,
        frameStyle: template.frameStyle && template.frameStyle !== 'none' ? template.frameStyle : 'bottom-bar',
        frameText: template.frameText || design.frameText || 'SCAN ME',
      };
      await renderCustomQRCode(canvas, payload, framedDesign, targetWidth);
      return;
    }

    // 3. Card-based Layouts: Table Tent, Bank Stand, Minimal Card, Dark Card
    const cardWidth = targetWidth;
    const cardHeight = Math.round(targetWidth * 1.38);

    canvas.width = cardWidth;
    canvas.height = cardHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDark = layout === 'dark-card';

    // Background of the card
    ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
    ctx.fillRect(0, 0, cardWidth, cardHeight);

    // Border of the card
    ctx.strokeStyle = isDark ? '#1e293b' : '#e2e8f0';
    ctx.lineWidth = Math.max(2, Math.round(cardWidth * 0.008));
    ctx.beginPath();
    ctx.roundRect(
      ctx.lineWidth,
      ctx.lineWidth,
      cardWidth - ctx.lineWidth * 2,
      cardHeight - ctx.lineWidth * 2,
      Math.round(cardWidth * 0.04)
    );
    ctx.stroke();

    // Check for Brand / Store Logo on Header
    const brandLogoUrl = template.brandLogoUrl || extra.brandLogoUrl;
    let brandImg: HTMLImageElement | null = null;
    if (brandLogoUrl) {
      brandImg = await this.loadImage(brandLogoUrl);
    }

    // Render child QR code using the template's exact design (color palette, modules, eyes, logo, frame)
    const qrPixelWidth = Math.round(cardWidth * 0.58);
    const childQRCanvas = document.createElement('canvas');

    const effectiveChildDesign: QRDesignOptions = {
      ...design,
      frameStyle: template.frameStyle || design.frameStyle || 'none',
      frameText: template.frameText || design.frameText || '',
    };

    await renderCustomQRCode(childQRCanvas, payload, effectiveChildDesign, qrPixelWidth);

    const childActualWidth = childQRCanvas.width;
    const childActualHeight = childQRCanvas.height;

    const qrX = Math.round((cardWidth - childActualWidth) / 2);
    const qrY = Math.round(cardHeight * 0.24);

    // 3a. Table Tent Layout (Restaurant, Cafe, Dining Table)
    if (layout === 'table-tent') {
      let topTextY = Math.round(cardHeight * 0.07);

      // Render Brand / Store Logo at header if uploaded
      if (brandImg) {
        const maxLogoH = Math.round(cardHeight * 0.065);
        const aspect = (brandImg.width || 1) / (brandImg.height || 1);
        const logoW = Math.min(Math.round(cardWidth * 0.38), Math.round(maxLogoH * aspect));
        const logoH = Math.round(logoW / aspect);
        const logoX = Math.round((cardWidth - logoW) / 2);
        const logoY = Math.round(cardHeight * 0.025);
        ctx.drawImage(brandImg, logoX, logoY, logoW, logoH);
        topTextY = logoY + logoH + Math.round(cardHeight * 0.035);
      }

      // Top Table / Item Label
      ctx.fillStyle = '#64748b';
      ctx.font = `bold ${Math.round(cardWidth * 0.038)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText((extra.label || 'TABLE 01').toUpperCase(), cardWidth / 2, topTextY);

      // Header Title (e.g. MENU & ĐẶT MÓN)
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${Math.round(cardWidth * 0.052)}px sans-serif`;
      ctx.fillText(template.headerTitle || 'MENU & ĐẶT MÓN', cardWidth / 2, topTextY + Math.round(cardHeight * 0.055));

      // Subtitle
      ctx.fillStyle = '#64748b';
      ctx.font = `${Math.round(cardWidth * 0.032)}px sans-serif`;
      ctx.fillText(template.subtitle || 'Quét mã để xem thực đơn & gọi món', cardWidth / 2, topTextY + Math.round(cardHeight * 0.095));

      // QR Code Box - uses template bgColor to ensure contrast with custom palettes
      ctx.fillStyle = design.bgColor;
      ctx.beginPath();
      ctx.roundRect(qrX - 8, qrY - 8, childActualWidth + 16, childActualHeight + 16, 12);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw QR Canvas
      ctx.drawImage(childQRCanvas, qrX, qrY, childActualWidth, childActualHeight);

      // Wi-Fi credentials box if enabled in template
      const showWifi = template.includeWifi && (template.wifiSsid || extra.wifiSsid);
      if (showWifi) {
        const wifiBoxY = qrY + childActualHeight + Math.round(cardHeight * 0.032);
        const wifiBoxW = Math.round(cardWidth * 0.84);
        const wifiBoxH = Math.round(cardHeight * 0.105);
        const wifiBoxX = (cardWidth - wifiBoxW) / 2;

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(wifiBoxX, wifiBoxY, wifiBoxW, wifiBoxH, 10);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.stroke();

        const ssid = extra.wifiSsid || template.wifiSsid || 'Cafe_Wifi';
        const pass = extra.wifiPass || template.wifiPass || 'coffee2026';

        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${Math.round(cardWidth * 0.034)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`Wi-Fi: ${ssid}`, cardWidth / 2, wifiBoxY + wifiBoxH * 0.44);

        ctx.fillStyle = '#475569';
        ctx.font = `${Math.round(cardWidth * 0.03)}px monospace`;
        ctx.fillText(`Mật khẩu: ${pass}`, cardWidth / 2, wifiBoxY + wifiBoxH * 0.8);
      }

      // Footer Message
      // Keep the footer below the last content block instead of letting it drift
      // into the middle when the optional Wi-Fi section consumes vertical space.
      const tableTentContentBottom = showWifi
        ? wifiBoxY + wifiBoxH
        : qrY + childActualHeight;
      const tableTentFooterY = Math.max(
        cardHeight - Math.round(cardHeight * 0.04),
        tableTentContentBottom + Math.round(cardHeight * 0.04)
      );
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.round(cardWidth * 0.03)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(template.footerMessage || 'Cảm ơn quý khách!', cardWidth / 2, tableTentFooterY);
    }

    // 3b. Bank Stand Layout (VietQR, Napas 247 Cashier Display)
    else if (layout === 'bank-stand') {
      const topBarH = Math.round(cardHeight * 0.14);
      // Top header bar uses template fgColor or Napas green
      ctx.fillStyle = design.fgColor !== '#000000' ? design.fgColor : '#065f46';
      ctx.beginPath();
      ctx.roundRect(ctx.lineWidth, ctx.lineWidth, cardWidth - ctx.lineWidth * 2, topBarH, [
        Math.round(cardWidth * 0.04),
        Math.round(cardWidth * 0.04),
        0,
        0,
      ]);
      ctx.fill();

      // Brand Logo in Bank Header or VietQR text
      if (brandImg) {
        const logoH = Math.round(topBarH * 0.55);
        const aspect = (brandImg.width || 1) / (brandImg.height || 1);
        const logoW = Math.min(Math.round(cardWidth * 0.3), Math.round(logoH * aspect));
        const logoX = Math.round((cardWidth - logoW) / 2);
        const logoY = Math.round((topBarH - logoH) / 2) - 4;
        ctx.drawImage(brandImg, logoX, logoY, logoW, logoH);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(cardWidth * 0.045)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('VietQR · NAPAS 247', cardWidth / 2, topBarH * 0.5);
      }

      ctx.fillStyle = '#e2e8f0';
      ctx.font = `${Math.round(cardWidth * 0.028)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(template.headerTitle || 'THANH TOÁN CHUYỂN KHOẢN', cardWidth / 2, topBarH * 0.85);

      // QR Code Box - uses template bgColor
      ctx.fillStyle = design.bgColor;
      ctx.beginPath();
      ctx.roundRect(qrX - 8, qrY - 8, childActualWidth + 16, childActualHeight + 16, 12);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw QR Canvas
      ctx.drawImage(childQRCanvas, qrX, qrY, childActualWidth, childActualHeight);

      // Account Details Box
      const infoY = qrY + childActualHeight + Math.round(cardHeight * 0.035);
      const infoW = Math.round(cardWidth * 0.86);
      const infoH = Math.round(cardHeight * 0.14);
      const infoX = (cardWidth - infoW) / 2;

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(infoX, infoY, infoW, infoH, 10);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.stroke();

      const accName = extra.accountName || extra.label || 'CHỦ TÀI KHOẢN';
      const accNo = extra.accountNumber || '0123456789';
      const bName = extra.bankName || 'NGÂN HÀNG';

      ctx.textAlign = 'left';
      const textPadX = infoX + 16;
      ctx.fillStyle = '#64748b';
      ctx.font = `${Math.round(cardWidth * 0.028)}px sans-serif`;
      ctx.fillText(`Chủ TK:`, textPadX, infoY + infoH * 0.32);
      ctx.fillText(`Số TK:`, textPadX, infoY + infoH * 0.62);
      ctx.fillText(`Ngân hàng:`, textPadX, infoY + infoH * 0.88);

      ctx.textAlign = 'right';
      const textRightX = infoX + infoW - 16;
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${Math.round(cardWidth * 0.03)}px sans-serif`;
      ctx.fillText(accName.toUpperCase(), textRightX, infoY + infoH * 0.32);

      ctx.font = `bold ${Math.round(cardWidth * 0.034)}px monospace`;
      ctx.fillText(accNo, textRightX, infoY + infoH * 0.62);

      ctx.font = `bold ${Math.round(cardWidth * 0.03)}px sans-serif`;
      ctx.fillText(bName, textRightX, infoY + infoH * 0.88);

      // Footer
      // Keep the footer below the account details when the card has less vertical room.
      const bankContentBottom = infoY + infoH;
      const bankFooterY = Math.max(
        cardHeight - Math.round(cardHeight * 0.035),
        bankContentBottom + Math.round(cardHeight * 0.035)
      );
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.round(cardWidth * 0.028)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(template.footerMessage || 'Quét bằng app ngân hàng bất kỳ', cardWidth / 2, bankFooterY);
    }

    // 3c. Minimal Desk Plaque Layout
    else if (layout === 'minimal-card') {
      let topY = Math.round(cardHeight * 0.08);
      if (brandImg) {
        const logoH = Math.round(cardHeight * 0.06);
        const aspect = (brandImg.width || 1) / (brandImg.height || 1);
        const logoW = Math.min(Math.round(cardWidth * 0.35), Math.round(logoH * aspect));
        const logoX = Math.round((cardWidth - logoW) / 2);
        const logoY = Math.round(cardHeight * 0.03);
        ctx.drawImage(brandImg, logoX, logoY, logoW, logoH);
        topY = logoY + logoH + Math.round(cardHeight * 0.04);
      }

      // Header Label / Title
      ctx.fillStyle = design.fgColor !== '#000000' ? design.fgColor : '#0f172a';
      ctx.font = `bold ${Math.round(cardWidth * 0.052)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(template.headerTitle || 'SCAN TO CONNECT', cardWidth / 2, topY);

      // Subtitle
      ctx.fillStyle = '#64748b';
      ctx.font = `${Math.round(cardWidth * 0.032)}px sans-serif`;
      ctx.fillText(extra.label || template.subtitle || 'Official QR Portal', cardWidth / 2, topY + Math.round(cardHeight * 0.055));

      // QR Code Box - uses template bgColor
      ctx.fillStyle = design.bgColor;
      ctx.beginPath();
      ctx.roundRect(qrX - 6, qrY - 6, childActualWidth + 12, childActualHeight + 12, 10);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw QR Canvas
      ctx.drawImage(childQRCanvas, qrX, qrY, childActualWidth, childActualHeight);

      // Footer Note
      const minimalContentBottom = qrY + childActualHeight;
      const minimalFooterY = Math.max(
        cardHeight - Math.round(cardHeight * 0.06),
        minimalContentBottom + Math.round(cardHeight * 0.04)
      );
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.round(cardWidth * 0.032)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(template.footerMessage || 'Point your camera to scan', cardWidth / 2, minimalFooterY);
    }

    // 3d. Dark Slate Studio Card
    else if (layout === 'dark-card') {
      let topY = Math.round(cardHeight * 0.09);
      if (brandImg) {
        const logoH = Math.round(cardHeight * 0.06);
        const aspect = (brandImg.width || 1) / (brandImg.height || 1);
        const logoW = Math.min(Math.round(cardWidth * 0.35), Math.round(logoH * aspect));
        const logoX = Math.round((cardWidth - logoW) / 2);
        const logoY = Math.round(cardHeight * 0.03);
        ctx.drawImage(brandImg, logoX, logoY, logoW, logoH);
        topY = logoY + logoH + Math.round(cardHeight * 0.04);
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = `bold ${Math.round(cardWidth * 0.035)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText((extra.label || 'DIGITAL ACCESS').toUpperCase(), cardWidth / 2, topY);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(cardWidth * 0.05)}px sans-serif`;
      ctx.fillText(template.headerTitle || 'EXCLUSIVE ACCESS', cardWidth / 2, topY + Math.round(cardHeight * 0.06));

      // Draw QR with template bgColor
      ctx.fillStyle = design.bgColor;
      ctx.beginPath();
      ctx.roundRect(qrX - 10, qrY - 10, childActualWidth + 20, childActualHeight + 20, 14);
      ctx.fill();

      ctx.drawImage(childQRCanvas, qrX, qrY, childActualWidth, childActualHeight);

      // Footer
      const darkCardContentBottom = qrY + childActualHeight;
      const darkCardFooterY = Math.max(
        cardHeight - Math.round(cardHeight * 0.05),
        darkCardContentBottom + Math.round(cardHeight * 0.04)
      );
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.round(cardWidth * 0.03)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(template.footerMessage || 'Secure Verification', cardWidth / 2, darkCardFooterY);
    }
  }

  /**
   * Render directly to an image data URL with specific resolution
   */
  public static async renderToDataUrl(
    payload: string,
    template: QRTemplate,
    extra: QRRenderContextOptions = {},
    targetWidth: number = 1024
  ): Promise<string> {
    const offscreen = document.createElement('canvas');
    await this.renderToCanvas(offscreen, payload, template, extra, targetWidth);
    return offscreen.toDataURL('image/png');
  }

  /**
   * Helper to ensure frame and design options are unified and effective
   */
  public static getEffectiveDesign(template: QRTemplate): QRDesignOptions {
    return {
      ...template.design,
      frameStyle: template.frameStyle || template.design.frameStyle || 'none',
      frameText: template.frameText || template.design.frameText || '',
    };
  }
}
