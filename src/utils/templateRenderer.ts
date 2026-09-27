import { QRTemplate, QRType } from '../types/qr';
import { QRRenderingService, QRRenderContextOptions } from '../services/qrRenderingService';

export type RenderTemplateOptions = QRRenderContextOptions;

/**
 * Centralized template renderer adapter.
 * Directly proxies to the centralized QRRenderingService for 100% consistent rendering
 * across Live Preview, Downloads, Copy, Print Dialogs, and Batch ZIP Export.
 */
export async function renderTemplatedQR(
  canvas: HTMLCanvasElement,
  payload: string,
  template: QRTemplate,
  extra: RenderTemplateOptions = {},
  targetWidth: number = 420
): Promise<void> {
  return QRRenderingService.renderToCanvas(canvas, payload, template, extra, targetWidth);
}

export { QRRenderingService };
