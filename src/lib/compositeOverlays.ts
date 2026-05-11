import type { GraphicOverlay } from './types';

/**
 * Composites graphic overlays on top of a base image.
 * All overlay positions/sizes are stored as percentages (0-1),
 * so they scale to any output resolution.
 *
 * @param imageBase64 - The base image (without data: prefix)
 * @param overlays - Array of graphic overlays to draw on top
 * @returns Promise resolving to the composited image base64 (without data: prefix)
 */
export function compositeOverlays(
  imageBase64: string,
  overlays: GraphicOverlay[],
): Promise<string> {
  if (!overlays || overlays.length === 0) return Promise.resolve(imageBase64);

  return new Promise((resolve, reject) => {
    const baseImg = new Image();
    baseImg.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = baseImg.naturalWidth;
      canvas.height = baseImg.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(baseImg, 0, 0);

      let remaining = overlays.length;
      const drawOrder: { overlay: GraphicOverlay; img: HTMLImageElement }[] = [];

      overlays.forEach((overlay, idx) => {
        const oImg = new Image();
        oImg.onload = () => {
          drawOrder[idx] = { overlay, img: oImg };
          remaining--;
          if (remaining === 0) {
            // Draw all overlays in original order
            for (const { overlay: ov, img } of drawOrder) {
              ctx.drawImage(
                img,
                ov.xPct * canvas.width,
                ov.yPct * canvas.height,
                ov.widthPct * canvas.width,
                ov.heightPct * canvas.height,
              );
            }
            resolve(canvas.toDataURL('image/png').split(',')[1]);
          }
        };
        oImg.onerror = () => {
          remaining--;
          if (remaining === 0) {
            // Resolve with whatever we have
            for (const entry of drawOrder) {
              if (!entry) continue;
              const { overlay: ov, img } = entry;
              ctx.drawImage(
                img,
                ov.xPct * canvas.width,
                ov.yPct * canvas.height,
                ov.widthPct * canvas.width,
                ov.heightPct * canvas.height,
              );
            }
            resolve(canvas.toDataURL('image/png').split(',')[1]);
          }
        };
        oImg.src = overlay.src;
      });
    };
    baseImg.onerror = () => reject(new Error('Failed to load base image'));
    baseImg.src = `data:image/png;base64,${imageBase64}`;
  });
}
