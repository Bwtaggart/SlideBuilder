import { jsPDF } from 'jspdf';
import type { Slide } from './types';

/**
 * Load an image element from a data URL.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = src;
    });
}

/**
 * Build a PDF blob from slides. Does NOT trigger download.
 */
export async function buildPdfBlob(slides: Slide[]): Promise<Blob> {
    const slidesWithImages = slides.filter((s) => s.image_url);
    if (slidesWithImages.length === 0) {
        throw new Error('No slides with images to export');
    }

    const pageW = 338.67;
    const pageH = 190.5;

    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [pageW, pageH],
    });

    for (let i = 0; i < slidesWithImages.length; i++) {
        const slide = slidesWithImages[i];

        if (i > 0) {
            pdf.addPage([pageW, pageH], 'landscape');
        }

        if (slide.image_url) {
            try {
                let imgData = slide.image_url;
                let format: string = 'PNG';

                if (imgData.includes('image/jpeg') || imgData.includes('image/jpg')) {
                    format = 'JPEG';
                } else if (imgData.includes('image/webp')) {
                    const img = await loadImage(imgData);
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d')!;
                    ctx.drawImage(img, 0, 0);
                    imgData = canvas.toDataURL('image/png');
                    format = 'PNG';
                }

                pdf.addImage(imgData, format, 0, 0, pageW, pageH);
            } catch (err) {
                console.error(`Failed to add slide ${i + 1} to PDF:`, err);
                pdf.setFontSize(24);
                pdf.setTextColor(150, 150, 150);
                pdf.text(`Slide ${i + 1} — Image could not be rendered`, pageW / 2, pageH / 2, { align: 'center' });
            }
        }
    }

    return pdf.output('blob');
}
