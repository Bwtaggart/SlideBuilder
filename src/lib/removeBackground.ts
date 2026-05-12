/**
 * Client-side background removal using HTML Canvas.
 *
 * Detects the dominant background color by sampling corner pixels,
 * then replaces all similar pixels with full transparency.
 * Works best for logos / icons on solid-color backgrounds.
 */

/** Euclidean distance between two RGB colors. */
function colorDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * Remove the background from an image, returning a transparent-PNG data URL.
 *
 * @param imageDataUrl  A data-URL (or object URL) of the source image.
 * @param tolerance     0-255 colour-distance threshold.  Default 30 works well
 *                      for white / light-grey backgrounds; bump to ~50 for
 *                      JPEG artefacts around the edge.
 */
export function removeBackground(
  imageDataUrl: string,
  tolerance = 30,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const w = canvas.width;
        const h = canvas.height;
        const imageData = ctx.getImageData(0, 0, w, h);
        const d = imageData.data; // RGBA flat array

        // ── 1. Sample corners to detect the background color ──────────
        // Take 4×4 patches from each corner and average the RGB values.
        const patchSize = Math.min(4, Math.floor(w / 10), Math.floor(h / 10)) || 1;
        const corners = [
          { x: 0, y: 0 },                        // top-left
          { x: w - patchSize, y: 0 },             // top-right
          { x: 0, y: h - patchSize },             // bottom-left
          { x: w - patchSize, y: h - patchSize },  // bottom-right
        ];

        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (const corner of corners) {
          for (let dy = 0; dy < patchSize; dy++) {
            for (let dx = 0; dx < patchSize; dx++) {
              const idx = ((corner.y + dy) * w + (corner.x + dx)) * 4;
              rSum += d[idx];
              gSum += d[idx + 1];
              bSum += d[idx + 2];
              count++;
            }
          }
        }

        const bgR = Math.round(rSum / count);
        const bgG = Math.round(gSum / count);
        const bgB = Math.round(bSum / count);

        // ── 2. Replace matching pixels with transparent ───────────────
        for (let i = 0; i < d.length; i += 4) {
          const dist = colorDistance(d[i], d[i + 1], d[i + 2], bgR, bgG, bgB);
          if (dist < tolerance) {
            // Fully transparent
            d[i + 3] = 0;
          } else if (dist < tolerance * 1.5) {
            // Semi-transparent fringe for smoother edges
            const alpha = Math.round(((dist - tolerance) / (tolerance * 0.5)) * 255);
            d[i + 3] = Math.min(d[i + 3], alpha);
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for background removal'));
    img.src = imageDataUrl;
  });
}
