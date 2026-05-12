/**
 * Background removal using the Gemini API for intelligent subject detection,
 * followed by a Canvas pass to convert the white background to transparency.
 *
 * Flow:
 *   1. POST the image to /api/remove-bg  (Gemini isolates the subject on white)
 *   2. Canvas color-key: replace near-white pixels with full transparency
 *
 * If the API call fails, falls back to a pure Canvas heuristic that samples
 * corner pixels to detect the background color.
 */

/** Euclidean distance between two RGB colors. */
function colorDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * Replace near-white (or a detected background color) with transparency.
 * Returns a transparent-PNG data URL.
 */
function colorKeyToTransparent(
  imageDataUrl: string,
  bgR = 255,
  bgG = 255,
  bgB = 255,
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
        const d = imageData.data;

        for (let i = 0; i < d.length; i += 4) {
          const dist = colorDistance(d[i], d[i + 1], d[i + 2], bgR, bgG, bgB);
          if (dist < tolerance) {
            d[i + 3] = 0;
          } else if (dist < tolerance * 1.5) {
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
    img.onerror = () => reject(new Error('Failed to load image for color-keying'));
    img.src = imageDataUrl;
  });
}

/**
 * Pure-client fallback: sample corners to guess background color,
 * then key it to transparent.
 */
function canvasFallback(imageDataUrl: string, tolerance = 30): Promise<string> {
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
        const d = imageData.data;

        // Sample corners to detect background color
        const patchSize = Math.min(4, Math.floor(w / 10), Math.floor(h / 10)) || 1;
        const corners = [
          { x: 0, y: 0 },
          { x: w - patchSize, y: 0 },
          { x: 0, y: h - patchSize },
          { x: w - patchSize, y: h - patchSize },
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

        for (let i = 0; i < d.length; i += 4) {
          const dist = colorDistance(d[i], d[i + 1], d[i + 2], bgR, bgG, bgB);
          if (dist < tolerance) {
            d[i + 3] = 0;
          } else if (dist < tolerance * 1.5) {
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

/**
 * Remove the background from an image, returning a transparent-PNG data URL.
 *
 * Uses the Gemini API to intelligently isolate the subject on a white
 * background, then color-keys white to transparent.  Falls back to a
 * pure-Canvas corner-sampling heuristic if the API is unavailable.
 */
export async function removeBackground(imageDataUrl: string): Promise<string> {
  try {
    // Strip the data-URL prefix to get raw base64 for the API
    const base64 = imageDataUrl.includes(',')
      ? imageDataUrl.split(',')[1]
      : imageDataUrl;

    const res = await fetch('/api/remove-bg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64 }),
    });

    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }

    const { imageBase64, mimeType } = await res.json();
    const mime = mimeType || 'image/png';
    const apiResultUrl = `data:${mime};base64,${imageBase64}`;

    // Gemini returns the subject on a white background — key white to transparent
    return await colorKeyToTransparent(apiResultUrl, 255, 255, 255, 35);
  } catch (err) {
    console.warn('API background removal failed, using Canvas fallback:', err);
    return canvasFallback(imageDataUrl);
  }
}
