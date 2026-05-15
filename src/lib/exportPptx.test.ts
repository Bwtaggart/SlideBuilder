import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Slide } from './types';

class MockSlide {
    background?: { data: string };
    addImage = vi.fn();
    addText = vi.fn();
    addNotes = vi.fn();
}

class MockPptx {
    title = '';
    author = '';
    layout = '';
    slides: MockSlide[] = [];
    defineLayout = vi.fn();
    addSlide = vi.fn(() => {
        const slide = new MockSlide();
        this.slides.push(slide);
        return slide;
    });
    write = vi.fn(async () => new Blob(['pptx']));
}

const baseSlide: Slide = {
    slide_id: 's1',
    presentation_id: 'p1',
    slide_index: 0,
    local_prompt: 'prompt',
    title: 'Quarterly Results',
    subtitle: 'Q4 2026',
    bullets: ['Revenue up 42%', 'ARR $3.2M'],
    image_url: 'data:image/png;base64,abc123',
    speaker_notes: 'Speak to growth drivers.',
};

async function loadWithMock() {
    const ctor = vi.fn(() => new MockPptx());
    vi.doMock('pptxgenjs', () => ({ default: ctor }));
    const mod = await import('./exportPptx');
    return { buildPptxBlob: mod.buildPptxBlob, ctor };
}

describe('buildPptxBlob', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('exports each slide as a single full-bleed image with notes', async () => {
        const { buildPptxBlob, ctor } = await loadWithMock();
        await buildPptxBlob([baseSlide]);

        const pptx = ctor.mock.results[0].value as MockPptx;
        const slide = pptx.slides[0];

        expect(slide.addImage).toHaveBeenCalledTimes(1);
        expect(slide.addText).toHaveBeenCalledTimes(0);
        expect(slide.addNotes).toHaveBeenCalledWith('Speak to growth drivers.');
    });

    it('skips slides without an image', async () => {
        const { buildPptxBlob, ctor } = await loadWithMock();
        const slideA: Slide = { ...baseSlide, slide_id: 'a' };
        const slideB: Slide = { ...baseSlide, slide_id: 'b', image_url: '' };

        await buildPptxBlob([slideA, slideB]);

        const pptx = ctor.mock.results[0].value as MockPptx;
        expect(pptx.slides).toHaveLength(1);
    });

    it('throws when no slide has an image', async () => {
        const { buildPptxBlob } = await loadWithMock();
        await expect(buildPptxBlob([{ ...baseSlide, image_url: '' }])).rejects.toThrow(/No slides/);
    });
});
