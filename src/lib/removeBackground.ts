/**
 * Client-side background removal using @imgly/background-removal.
 * The ONNX model (~30 MB) is downloaded once and cached by the browser.
 */

let removeModule: typeof import('@imgly/background-removal') | null = null;

/**
 * Remove the background from an image, returning a transparent-PNG data URL.
 * The library is lazily imported on first call so it doesn't bloat initial load.
 */
export async function removeBackground(imageDataUrl: string): Promise<string> {
  if (!removeModule) {
    removeModule = await import('@imgly/background-removal');
  }

  // The library accepts a data URL, Blob, or URL string and returns a Blob.
  const blob = await removeModule.removeBackground(imageDataUrl, {
    // Use the CDN-hosted model so we don't need to serve ONNX files ourselves.
    publicPath: 'https://unpkg.com/@imgly/background-removal@1.7.0/dist/',
  });

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
