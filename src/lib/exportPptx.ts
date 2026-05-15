import PptxGenJS from 'pptxgenjs';
import type { AspectRatio, Slide } from './types';

const PPTX_DIMS_BY_ASPECT_RATIO: Record<AspectRatio, { width: number; height: number; layout: string }> = {
    '16:9': { width: 13.333, height: 7.5, layout: 'LAYOUT_WIDE' },
    '4:3': { width: 10, height: 7.5, layout: 'LAYOUT_STANDARD' },
    '9:16': { width: 5.625, height: 10, layout: 'CUSTOM' },
};

export interface BuildPptxOptions {
    aspectRatio?: AspectRatio;
}

/**
 * Build a PPTX blob from slides. Each slide is exported as a single full-bleed image,
 * with the slide's speaker notes attached. Does NOT trigger download.
 */
export async function buildPptxBlob(slides: Slide[], options: BuildPptxOptions = {}): Promise<Blob> {
    const aspectRatio: AspectRatio = options.aspectRatio || '16:9';
    const dims = PPTX_DIMS_BY_ASPECT_RATIO[aspectRatio];
    const pptx = new PptxGenJS();

    pptx.title = 'AI Presentation';
    pptx.author = 'SlideBuilder';
    if (dims.layout === 'CUSTOM') {
        pptx.defineLayout({ name: 'CUSTOM_PORTRAIT', width: dims.width, height: dims.height });
        pptx.layout = 'CUSTOM_PORTRAIT';
    } else {
        pptx.layout = dims.layout;
    }

    const slidesWithImages = slides.filter((s) => s.image_url);
    if (slidesWithImages.length === 0) {
        throw new Error('No slides with images to export');
    }

    for (const slide of slidesWithImages) {
        const pptxSlide = pptx.addSlide();
        pptxSlide.background = { data: slide.image_url };
        pptxSlide.addImage({
            data: slide.image_url,
            x: 0,
            y: 0,
            w: '100%',
            h: '100%',
        });
        if (slide.speaker_notes) {
            pptxSlide.addNotes(slide.speaker_notes);
        }
    }

    const output = await pptx.write({ outputType: 'blob' });
    return output as Blob;
}
