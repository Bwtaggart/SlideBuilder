import type { AspectRatio, AspectRatioTextLayouts, SlideTextLayout, TextBoxRect } from './types';

export interface PptxRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface PptxTextStyle {
    fontSize: number;
    color: string;
    bold?: boolean;
    shadow?: {
        type: 'outer';
        color: string;
        blur: number;
        angle: number;
        distance: number;
        opacity: number;
    };
    margin: number;
    valign: 'top' | 'mid' | 'bot';
    align: 'left' | 'center' | 'right' | 'justify';
}

export interface PptxTextStyles {
    title: PptxTextStyle;
    subtitle: PptxTextStyle;
    bullets: PptxTextStyle;
}

export const LAYOUT_BY_ASPECT_RATIO: AspectRatioTextLayouts = {
    '16:9': {
        title: { xPct: 8, yPct: 8, wPct: 58, hPct: 13 },
        subtitle: { xPct: 8, yPct: 21, wPct: 58, hPct: 10 },
        bullets: { xPct: 8, yPct: 34, wPct: 52, hPct: 50 },
    },
    '4:3': {
        title: { xPct: 8, yPct: 8, wPct: 60, hPct: 15 },
        subtitle: { xPct: 8, yPct: 23, wPct: 60, hPct: 10 },
        bullets: { xPct: 8, yPct: 36, wPct: 56, hPct: 50 },
    },
    '9:16': {
        title: { xPct: 10, yPct: 10, wPct: 80, hPct: 10 },
        subtitle: { xPct: 10, yPct: 21, wPct: 80, hPct: 8 },
        bullets: { xPct: 10, yPct: 33, wPct: 80, hPct: 53 },
    },
};

export const TEXT_STYLES_BY_ASPECT_RATIO: Record<AspectRatio, PptxTextStyles> = {
    '16:9': {
        title: {
            fontSize: 34,
            color: 'FFFFFF',
            bold: true,
            shadow: { type: 'outer', color: '000000', blur: 2, angle: 45, distance: 1, opacity: 0.6 },
            margin: 2,
            valign: 'top',
            align: 'left',
        },
        subtitle: {
            fontSize: 20,
            color: 'FFFFFF',
            shadow: { type: 'outer', color: '000000', blur: 2, angle: 45, distance: 1, opacity: 0.55 },
            margin: 1,
            valign: 'top',
            align: 'left',
        },
        bullets: {
            fontSize: 16,
            color: 'FFFFFF',
            shadow: { type: 'outer', color: '000000', blur: 2, angle: 45, distance: 1, opacity: 0.5 },
            margin: 4,
            valign: 'top',
            align: 'left',
        },
    },
    '4:3': {
        title: {
            fontSize: 32,
            color: 'FFFFFF',
            bold: true,
            shadow: { type: 'outer', color: '000000', blur: 2, angle: 45, distance: 1, opacity: 0.6 },
            margin: 2,
            valign: 'top',
            align: 'left',
        },
        subtitle: {
            fontSize: 19,
            color: 'FFFFFF',
            shadow: { type: 'outer', color: '000000', blur: 2, angle: 45, distance: 1, opacity: 0.55 },
            margin: 1,
            valign: 'top',
            align: 'left',
        },
        bullets: {
            fontSize: 15,
            color: 'FFFFFF',
            shadow: { type: 'outer', color: '000000', blur: 2, angle: 45, distance: 1, opacity: 0.5 },
            margin: 4,
            valign: 'top',
            align: 'left',
        },
    },
    '9:16': {
        title: {
            fontSize: 30,
            color: 'FFFFFF',
            bold: true,
            shadow: { type: 'outer', color: '000000', blur: 2, angle: 45, distance: 1, opacity: 0.6 },
            margin: 2,
            valign: 'top',
            align: 'left',
        },
        subtitle: {
            fontSize: 18,
            color: 'FFFFFF',
            shadow: { type: 'outer', color: '000000', blur: 2, angle: 45, distance: 1, opacity: 0.55 },
            margin: 1,
            valign: 'top',
            align: 'left',
        },
        bullets: {
            fontSize: 15,
            color: 'FFFFFF',
            shadow: { type: 'outer', color: '000000', blur: 2, angle: 45, distance: 1, opacity: 0.5 },
            margin: 4,
            valign: 'top',
            align: 'left',
        },
    },
};

export const PPTX_DIMS_BY_ASPECT_RATIO: Record<AspectRatio, { width: number; height: number; layout: string }> = {
    '16:9': { width: 13.333, height: 7.5, layout: 'LAYOUT_WIDE' },
    '4:3': { width: 10, height: 7.5, layout: 'LAYOUT_STANDARD' },
    '9:16': { width: 5.625, height: 10, layout: 'CUSTOM' },
};

export function getSlideTextLayout(aspectRatio: AspectRatio): SlideTextLayout {
    return LAYOUT_BY_ASPECT_RATIO[aspectRatio];
}

export function getTextStyles(aspectRatio: AspectRatio): PptxTextStyles {
    return TEXT_STYLES_BY_ASPECT_RATIO[aspectRatio];
}

export function getPptxDims(aspectRatio: AspectRatio): { width: number; height: number; layout: string } {
    return PPTX_DIMS_BY_ASPECT_RATIO[aspectRatio];
}

export function pctRectToPptxRect(rect: TextBoxRect, slideWidth: number, slideHeight: number): PptxRect {
    return {
        x: (rect.xPct / 100) * slideWidth,
        y: (rect.yPct / 100) * slideHeight,
        w: (rect.wPct / 100) * slideWidth,
        h: (rect.hPct / 100) * slideHeight,
    };
}
