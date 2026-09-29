import QRCode from 'qrcode';
import { QRDesignOptions, ErrorCorrectionLevel } from '../types/qr';

export interface QRDiagnostics {
  version: number;
  gridSize: number;
  byteCount: number;
  contrastRatio: number;
  isContrastSafe: boolean;
  optimalDistance: string;
}

// Helper to compute contrast ratio between two hex colors
export function getContrastRatio(hex1: string, hex2: string): number {
  const getLuminance = (hex: string) => {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const num = parseInt(c, 16);
    const r = ((num >> 16) & 255) / 255;
    const g = ((num >> 8) & 255) / 255;
    const b = (num & 255) / 255;
    const a = [r, g, b].map((v) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };

  try {
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(1));
  } catch {
    return 21;
  }
}

export function computeDiagnostics(payload: string, design: QRDesignOptions): QRDiagnostics {
  const byteCount = new TextEncoder().encode(payload).length;
  let version = 1;
  let gridSize = 21;

  try {
    const qr = QRCode.create(payload, {
      errorCorrectionLevel: design.errorCorrectionLevel,
    });
    version = qr.version;
    gridSize = qr.modules.size;
  } catch {
    // fallback
  }

  const contrast = getContrastRatio(design.fgColor, design.bgColor);
  const isContrastSafe = contrast >= 3.5;

  // Rule of thumb for distance: scan distance ~= 10x print size
  // e.g. at 5cm width: ~0.5m; at 10cm: ~1.0m; at 20cm: ~2.0m
  const optimalDistance = `0.3m – ${(0.8 + version * 0.1).toFixed(1)}m`;

  return {
    version,
    gridSize,
    byteCount,
    contrastRatio: contrast,
    isContrastSafe,
    optimalDistance,
  };
}

/**
 * Checks if a coordinate (r, c) is part of the three 7x7 corner finder patterns
 */
function isFinderPattern(r: number, c: number, size: number): boolean {
  // Top-left
  if (r < 7 && c < 7) return true;
  // Top-right
  if (r < 7 && c >= size - 7) return true;
  // Bottom-left
  if (r >= size - 7 && c < 7) return true;
  return false;
}

/**
 * Render complete QR Code with custom module style, eye style, frame caption, and center logo
 */
export async function renderCustomQRCode(
  canvas: HTMLCanvasElement,
  payload: string,
  design: QRDesignOptions,
  targetWidth: number = 320
): Promise<void> {
  const qr = QRCode.create(payload, {
    errorCorrectionLevel: design.errorCorrectionLevel,
  });

  const matrix = qr.modules;
  const size = matrix.size;
  const margin = design.margin;
  const totalModules = size + margin * 2;

  // Frame dimension calculation
  const hasFrame = design.frameStyle !== 'none' && design.frameText?.trim();
  const frameHeight = hasFrame ? Math.floor(targetWidth * 0.16) : 0;
  const frameTop = design.frameStyle === 'top-bar';

  const qrCanvasHeight = targetWidth;
  const totalCanvasHeight = targetWidth + (hasFrame ? frameHeight : 0);

  canvas.width = targetWidth;
  canvas.height = totalCanvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = design.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const qrOffsetY = hasFrame && frameTop ? frameHeight : 0;
  const cellSize = targetWidth / totalModules;

  // Draw modules
  ctx.fillStyle = design.fgColor;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix.get(r, c)) {
        const isFinder = isFinderPattern(r, c, size);
        const x = (c + margin) * cellSize;
        const y = qrOffsetY + (r + margin) * cellSize;

        if (isFinder) {
          // Handled separately below for eye styling, or draw square if default
          if (design.eyeStyle === 'square') {
            ctx.fillRect(x, y, cellSize + 0.2, cellSize + 0.2);
          }
        } else {
          // Regular data modules
          if (design.moduleStyle === 'dots') {
            const radius = (cellSize * 0.88) / 2;
            ctx.beginPath();
            ctx.arc(x + cellSize / 2, y + cellSize / 2, radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (design.moduleStyle === 'squircle') {
            ctx.beginPath();
            ctx.roundRect(x + 0.3, y + 0.3, cellSize - 0.6, cellSize - 0.6, cellSize * 0.35);
            ctx.fill();
          } else {
            // Square (classic)
            ctx.fillRect(x, y, cellSize + 0.2, cellSize + 0.2);
          }
        }
      }
    }
  }

  // Draw customized finder pattern eyes if rounded or circle
  if (design.eyeStyle !== 'square') {
    const drawEye = (startRow: number, startCol: number) => {
      const eyeX = (startCol + margin) * cellSize;
      const eyeY = qrOffsetY + (startRow + margin) * cellSize;
      const eyeSize = 7 * cellSize;
      const innerSize = 5 * cellSize;
      const centerSize = 3 * cellSize;

      // Clear eye area with background
      ctx.fillStyle = design.bgColor;
      ctx.fillRect(eyeX - 0.5, eyeY - 0.5, eyeSize + 1, eyeSize + 1);

      // Outer ring
      ctx.fillStyle = design.fgColor;
      if (design.eyeStyle === 'rounded') {
        ctx.beginPath();
        ctx.roundRect(eyeX, eyeY, eyeSize, eyeSize, eyeSize * 0.25);
        ctx.fill();

        ctx.fillStyle = design.bgColor;
        ctx.beginPath();
        ctx.roundRect(eyeX + cellSize, eyeY + cellSize, innerSize, innerSize, innerSize * 0.25);
        ctx.fill();

        ctx.fillStyle = design.fgColor;
        ctx.beginPath();
        ctx.roundRect(eyeX + cellSize * 2, eyeY + cellSize * 2, centerSize, centerSize, centerSize * 0.25);
        ctx.fill();
      } else if (design.eyeStyle === 'circle') {
        const center = eyeX + eyeSize / 2;
        const centerY = eyeY + eyeSize / 2;

        ctx.beginPath();
        ctx.arc(center, centerY, eyeSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = design.bgColor;
        ctx.beginPath();
        ctx.arc(center, centerY, innerSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = design.fgColor;
        ctx.beginPath();
        ctx.arc(center, centerY, centerSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    drawEye(0, 0); // Top-left
    drawEye(0, size - 7); // Top-right
    drawEye(size - 7, 0); // Bottom-left
  }

  // Draw Center Logo
  if (design.centerLogo !== 'none') {
    const logoSize = Math.floor(targetWidth * 0.22);
    const center = targetWidth / 2;
    const centerY = qrOffsetY + targetWidth / 2;
    const x = center - logoSize / 2;
    const y = centerY - logoSize / 2;

    // Background mask
    ctx.fillStyle = design.bgColor;
    ctx.beginPath();
    ctx.roundRect(x - 4, y - 4, logoSize + 8, logoSize + 8, 8);
    ctx.fill();
    ctx.strokeStyle = design.fgColor + '20';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (design.centerLogo === 'custom' && design.customLogoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = design.customLogoUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, x, y, logoSize, logoSize);
          resolve();
        };
        img.onerror = () => resolve();
      });
    } else if (design.centerLogo === 'bank') {
      ctx.fillStyle = '#005f33';
      ctx.beginPath();
      ctx.roundRect(x, y, logoSize, logoSize, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.floor(logoSize * 0.24)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VietQR', center, centerY);
    } else if (design.centerLogo === 'wifi') {
      ctx.fillStyle = design.fgColor;
      ctx.beginPath();
      ctx.roundRect(x, y, logoSize, logoSize, 6);
      ctx.fill();
      ctx.fillStyle = design.bgColor;
      ctx.font = `bold ${Math.floor(logoSize * 0.4)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📶', center, centerY);
    } else if (design.centerLogo === 'link') {
      ctx.fillStyle = design.fgColor;
      ctx.beginPath();
      ctx.roundRect(x, y, logoSize, logoSize, 6);
      ctx.fill();
      ctx.fillStyle = design.bgColor;
      ctx.font = `bold ${Math.floor(logoSize * 0.4)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔗', center, centerY);
    }
  }

  // Draw Frame & Caption
  if (hasFrame) {
    const textY = frameTop ? frameHeight / 2 : targetWidth + frameHeight / 2;
    const text = design.frameText.trim();

    if (design.frameStyle === 'bottom-bar' || design.frameStyle === 'top-bar') {
      const barY = frameTop ? 0 : targetWidth;
      ctx.fillStyle = design.fgColor;
      ctx.fillRect(0, barY, targetWidth, frameHeight);

      ctx.fillStyle = design.bgColor;
      ctx.font = `bold ${Math.max(12, Math.floor(frameHeight * 0.38))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text.toUpperCase(), targetWidth / 2, textY);
    } else if (design.frameStyle === 'badge') {
      const badgeHeight = Math.floor(frameHeight * 0.7);
      const badgeFontSize = Math.max(11, Math.floor(badgeHeight * 0.48));
      ctx.font = `bold ${badgeFontSize}px sans-serif`;
      // Size the pill from the actual rendered text width so short/small embedded
      // QR canvases never clip or shrink the caption. This keeps the live preview,
      // batch preview, ZIP export, and print render visually identical.
      const textWidth = ctx.measureText(text.toUpperCase()).width;
      const horizontalPadding = Math.max(16, Math.floor(badgeHeight * 0.75));
      const badgeWidth = Math.min(
        targetWidth * 0.92,
        Math.max(badgeHeight * 2.2, textWidth + horizontalPadding * 2)
      );
      const badgeX = (targetWidth - badgeWidth) / 2;
      const badgeY = (frameTop ? 0 : targetWidth) + (frameHeight - badgeHeight) / 2;

      ctx.fillStyle = design.fgColor;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2);
      ctx.fill();

      ctx.fillStyle = design.bgColor;
      ctx.font = `bold ${badgeFontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text.toUpperCase(), targetWidth / 2, badgeY + badgeHeight / 2);
    } else if (design.frameStyle === 'minimal-box') {
      ctx.strokeStyle = design.fgColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, targetWidth - 2, totalCanvasHeight - 2);

      ctx.fillStyle = design.fgColor;
      ctx.font = `bold ${Math.max(12, Math.floor(frameHeight * 0.35))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text.toUpperCase(), targetWidth / 2, textY);
    }
  }
}
