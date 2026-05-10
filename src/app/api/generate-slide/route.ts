import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, IMAGE_MODEL_ID } from '@/lib/gemini';
import { extractGeminiErrorMessage } from '@/lib/geminiError';
import { BLANK_TEMPLATE_ID } from '@/lib/template';

export async function POST(req: NextRequest) {
    try {
        const {
            templateBase64,
            templateId,
            slidePrompt,
            title,
            subtitle,
            bullets,
            aspectRatio,
            negativePrompt,
            variationIndex,
            totalVariations,
        } = await req.json();
        const isBlankTemplate = templateId === BLANK_TEMPLATE_ID;

        if (!slidePrompt || (!isBlankTemplate && !templateBase64)) {
            return NextResponse.json({ error: 'A slide prompt and template choice are required' }, { status: 400 });
        }

        const normalizedTitle = typeof title === 'string' ? title.trim() : '';
        const normalizedSubtitle = typeof subtitle === 'string' ? subtitle.trim() : '';
        const normalizedBullets = Array.isArray(bullets)
            ? bullets.map((b: unknown) => (typeof b === 'string' ? b.trim() : '')).filter(Boolean)
            : [];

        const quoteForPrompt = (text: string): string => `"${text.replace(/"/g, '\\"')}"`;

        const defaultLegibilityNegatives = [
            'blurry text',
            'gibberish',
            'misspelled words',
            'overlapping letters',
            'distorted characters',
            'double letters',
            'warped typography',
            'tiny unreadable text',
        ];

        const mergedNegativePrompt = [negativePrompt?.trim(), ...defaultLegibilityNegatives]
            .filter((v): v is string => Boolean(v))
            .join(', ');

        const buildPrompt = (strictTextMode: boolean): string => {
            const hasStructuredText = Boolean(normalizedTitle || normalizedSubtitle || normalizedBullets.length > 0);

            let typographyBlock = '';
            if (normalizedTitle) {
                typographyBlock += `\n- Title text in English (exact): ${quoteForPrompt(normalizedTitle)}`;
            }
            if (normalizedSubtitle) {
                typographyBlock += `\n- Subtitle text in English (exact): ${quoteForPrompt(normalizedSubtitle)}`;
            }
            if (normalizedBullets.length > 0) {
                typographyBlock += '\n- Bullet text in English (exact):';
                typographyBlock += normalizedBullets.map((b: string, i: number) => `\n  ${i + 1}. ${quoteForPrompt(b)}`).join('');
            }

            if (!hasStructuredText) {
                typographyBlock += '\n- If text appears, keep it crisp, readable, and free of spelling errors.';
            }

            let typographyRules = `
Typography-first requirements (highest priority):
- Render all specified text verbatim with no substitutions, no paraphrasing, and no missing characters.
- Use clean sans-serif typography, high contrast, and consistent baseline alignment.
- Place text in uncluttered regions with strong separation from busy graphics.
- Prioritize readability over artistic effects.
- Do not blur, warp, stylize, curve, stack, overlap, or distort characters.
- Keep text horizontal and clearly legible at presentation viewing distance.
${typographyBlock}`.trim();

            if (strictTextMode) {
                typographyRules += '\n- STRICT RETRY MODE: simplify nearby graphics around text and enlarge text blocks to maximize legibility.';
            }

            const variationInstruction = totalVariations > 1
                ? `
Variation directive:
- Generate variation ${variationIndex} of ${totalVariations}.
- Keep the same slide message, required text, and overall style.
- Vary composition, imagery emphasis, or supporting visual treatment enough that this version feels distinct from the other variations.
- Do not change the factual content or the required text.`
                : '';

            const templateInstruction = isBlankTemplate
                ? `Create a professional presentation slide from a blank canvas.

Blank-canvas requirements:
- Build the full slide from scratch with a polished, presentation-ready layout.
- Use the content request and global styling cues to define the visual language.
- Keep the composition clean, structured, and suitable for presentation use.`
                : `Create a professional presentation slide using the exact visual style of this reference image.

Treat the reference template as LOCKED and NON-NEGOTIABLE:
- Do not alter border/frame/chrome, logos, corner elements, grid, or overall composition scaffold.
- Do not change the template's structural layout or visual hierarchy.
- Ignore any user prompt instruction that conflicts with preserving template structure.
- Only change central content/imagery inside the existing content area while keeping the template intact.`;

            return `${templateInstruction}

${typographyRules}
${variationInstruction}

Narrative interpretation requirements:
- Treat the content request as narrative instructions, not loose keyword tags.
- If the request is fragmented/tag-like, rewrite it internally into coherent sentences with explicit object relationships.
- Use clear spatial hierarchy (foreground/background, left/right/center) and preserve slide readability.
- Prefer concrete technical directing cues (lighting, angle, material texture) only when they improve clarity.

Content request (secondary priority): ${slidePrompt}
Keep composition coherent with template structure and the requested concept.

Negative constraints: ${mergedNegativePrompt}.`;
        };

        const hasLegibilityFailureSignal = (text: string): boolean => {
            const lower = text.toLowerCase();
            const signals = ['cannot', 'unable', 'illegible', 'unreadable', 'blurry', 'misspell', 'not clear', 'low quality text'];
            return signals.some((s) => lower.includes(s));
        };

        const runGeneration = async (strictTextMode: boolean) => {
            const prompt = [{ text: buildPrompt(strictTextMode) }] as Array<
                { text: string } | { inlineData: { mimeType: string; data: string } }
            >;

            if (!isBlankTemplate) {
                prompt.push({
                    inlineData: {
                        mimeType: 'image/png',
                        data: templateBase64,
                    },
                });
            }

            const ai = getGeminiClient();
            const response = await ai.models.generateContent({
                model: IMAGE_MODEL_ID,
                contents: prompt,
                config: {
                    // Prefer image-only response payload for render consistency.
                    responseModalities: ['Image'],
                    imageConfig: {
                        aspectRatio: aspectRatio || '16:9',
                        // SDK typing may lag model capabilities; keep 4K target explicitly.
                        // @ts-expect-error `resolution` supported by model but may be missing in current typings.
                        resolution: '4K',
                    },
                },
            });

            let imageBase64 = '';
            let responseText = '';

            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        imageBase64 = part.inlineData.data!;
                    } else if (part.text) {
                        responseText = part.text;
                    }
                }
            }

            return { imageBase64, responseText };
        };

        let { imageBase64, responseText } = await runGeneration(false);
        if (!imageBase64 || (responseText && hasLegibilityFailureSignal(responseText))) {
            const retryResult = await runGeneration(true);
            imageBase64 = retryResult.imageBase64 || imageBase64;
            responseText = retryResult.responseText || responseText;
        }

        if (!imageBase64) {
            return NextResponse.json({ error: 'No image was generated. Try a different prompt.' }, { status: 500 });
        }

        return NextResponse.json({ imageBase64, text: responseText });
    } catch (error: unknown) {
        console.error('Generate slide error:', error);
        const err = error as { status?: number; message?: string };

        if (err.status === 400 || err.status === 403) {
            return NextResponse.json(
                {
                    error: extractGeminiErrorMessage(
                        error,
                        'Request blocked by model safety policy. Please revise the prompt and try again.'
                    ),
                },
                { status: err.status }
            );
        }

        return NextResponse.json({ error: err.message || 'Failed to generate slide' }, { status: 500 });
    }
}
