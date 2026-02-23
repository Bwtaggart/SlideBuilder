import PptxGenJS from 'pptxgenjs';
import type { Slide } from './types';

/**
 * Build a PPTX blob from slides. Does NOT trigger download.
 */
export async function buildPptxBlob(slides: Slide[]): Promise<Blob> {
    const pptx = new PptxGenJS();

    pptx.title = 'AI Presentation';
    pptx.author = 'SlideBuilder';
    pptx.layout = 'LAYOUT_WIDE'; // 16:9

    const slidesWithImages = slides.filter((s) => s.image_url);
    if (slidesWithImages.length === 0) {
        throw new Error('No slides with images to export');
    }

    for (const slide of slidesWithImages) {
        const pptxSlide = pptx.addSlide();

        if (slide.image_url) {
            pptxSlide.background = { data: slide.image_url };
            pptxSlide.addImage({
                data: slide.image_url,
                x: 0,
                y: 0,
                w: '100%',
                h: '100%',
            });
        }

        if (slide.speaker_notes) {
            pptxSlide.addNotes(slide.speaker_notes);
        }
    }

    const output = await pptx.write({ outputType: 'blob' });
    return output as Blob;
}
