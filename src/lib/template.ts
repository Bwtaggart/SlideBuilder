import type { AspectRatio, TemplateImage } from './types';

export const BLANK_TEMPLATE_ID = 'blank-template';

export function createBlankTemplate(aspectRatio: AspectRatio): TemplateImage {
    return {
        id: BLANK_TEMPLATE_ID,
        base64: '',
        url: `blank:${aspectRatio}`,
    };
}

export function isBlankTemplate(template: TemplateImage | null | undefined): boolean {
    return template?.id === BLANK_TEMPLATE_ID;
}
