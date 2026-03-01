import { describe, expect, it } from 'vitest';
import {
    LAYOUT_BY_ASPECT_RATIO,
    getPptxDims,
    getSlideTextLayout,
    pctRectToPptxRect,
} from './pptxLayout';

describe('pptxLayout', () => {
    it('returns deterministic zones for all supported aspect ratios', () => {
        const ratios = ['16:9', '4:3', '9:16'] as const;
        for (const ratio of ratios) {
            const layout = getSlideTextLayout(ratio);
            expect(layout).toEqual(LAYOUT_BY_ASPECT_RATIO[ratio]);
        }
    });

    it('keeps all layout percentages inside [0, 100]', () => {
        const ratios = ['16:9', '4:3', '9:16'] as const;
        for (const ratio of ratios) {
            const layout = getSlideTextLayout(ratio);
            const areas = [layout.title, layout.subtitle, layout.bullets];
            for (const area of areas) {
                expect(area.xPct).toBeGreaterThanOrEqual(0);
                expect(area.yPct).toBeGreaterThanOrEqual(0);
                expect(area.wPct).toBeGreaterThanOrEqual(0);
                expect(area.hPct).toBeGreaterThanOrEqual(0);
                expect(area.xPct + area.wPct).toBeLessThanOrEqual(100);
                expect(area.yPct + area.hPct).toBeLessThanOrEqual(100);
            }
        }
    });

    it('converts percentage rectangles into deterministic PPT coordinates', () => {
        const dims = getPptxDims('16:9');
        const rect = pctRectToPptxRect({ xPct: 10, yPct: 20, wPct: 50, hPct: 40 }, dims.width, dims.height);

        expect(rect.x).toBeCloseTo(1.3333, 3);
        expect(rect.y).toBeCloseTo(1.5, 3);
        expect(rect.w).toBeCloseTo(6.6665, 3);
        expect(rect.h).toBeCloseTo(3, 3);
    });
});
