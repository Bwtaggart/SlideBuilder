import PptxGenJS from 'pptxgenjs';
import {
    getPptxDims,
    getSlideTextLayout,
    getTextStyles,
    pctRectToPptxRect,
} from './pptxLayout';
import type { AspectRatio, PptxExportMode, Slide } from './types';

type PptxTextTheme = {
    fontFamily?: string;
};

export interface BuildPptxOptions {
    mode?: PptxExportMode;
    aspectRatio?: AspectRatio;
    theme?: PptxTextTheme;
}

/**
 * Build a PPTX blob from slides. Does NOT trigger download.
 * Defaults to image-only mode for backward compatibility.
 */
export async function buildPptxBlob(slides: Slide[], options: BuildPptxOptions = {}): Promise<Blob> {
    const mode: PptxExportMode = options.mode || 'image';
    const aspectRatio: AspectRatio = options.aspectRatio || '16:9';
    const dims = getPptxDims(aspectRatio);
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

        if (mode === 'hybrid_editable') {
            addHybridEditableText(pptxSlide, slide, aspectRatio, options.theme);
        }

        if (slide.speaker_notes) {
            pptxSlide.addNotes(slide.speaker_notes);
        }
    }

    const output = await pptx.write({ outputType: 'blob' });
    return output as Blob;
}

function addHybridEditableText(
    pptxSlide: {
        addText: (text: string | Array<{ text: string; options?: Record<string, unknown> }>, opts: Record<string, unknown>) => void;
    },
    slide: Slide,
    aspectRatio: AspectRatio,
    theme?: PptxTextTheme,
) {
    const layout = getSlideTextLayout(aspectRatio);
    const styles = getTextStyles(aspectRatio);
    const dims = getPptxDims(aspectRatio);

    const titleRect = pctRectToPptxRect(layout.title, dims.width, dims.height);
    const subtitleRect = pctRectToPptxRect(layout.subtitle, dims.width, dims.height);
    const bulletsRect = pctRectToPptxRect(layout.bullets, dims.width, dims.height);

    if (slide.title.trim()) {
        pptxSlide.addText(slide.title, {
            ...titleRect,
            ...styles.title,
            fontFace: theme?.fontFamily,
        });
    }

    if (slide.subtitle.trim()) {
        pptxSlide.addText(slide.subtitle, {
            ...subtitleRect,
            ...styles.subtitle,
            fontFace: theme?.fontFamily,
        });
    }

    const cleanedBullets = slide.bullets.map((b) => b.trim()).filter(Boolean);
    if (cleanedBullets.length > 0) {
        const bulletRuns = cleanedBullets.map((bullet) => ({
            text: bullet,
            options: {
                bullet: { indent: 18 },
                breakLine: true,
            },
        }));

        pptxSlide.addText(bulletRuns, {
            ...bulletsRect,
            ...styles.bullets,
            fontFace: theme?.fontFamily,
            fill: { color: '000000', transparency: 35 },
            margin: 6,
            breakLine: true,
        });
    }
}
