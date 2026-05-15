import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, IMAGE_MODEL_ID } from '@/lib/gemini';
import { extractGeminiErrorMessage } from '@/lib/geminiError';
import { BLANK_TEMPLATE_ID } from '@/lib/template';
import { requireAuth } from '@/lib/requireAuth';

export async function POST(req: NextRequest) {
    const { error } = await requireAuth();
    if (error) return error;
    try {
        const {
            templateBase64,
            templateId,
            slidePrompt,
            aspectRatio,
            negativePrompt,
            variationIndex,
            totalVariations,
            reservedZones,
        } = await req.json();
        const isBlankTemplate = templateId === BLANK_TEMPLATE_ID;

        if (!slidePrompt || (!isBlankTemplate && !templateBase64)) {
            return NextResponse.json({ error: 'A slide prompt and template choice are required' }, { status: 400 });
        }

        // Strong defaults that prioritize legible, well-formed typography on every slide.
        // These are appended to whatever the user provided, so a user-supplied negative
        // prompt is preserved AND we always discourage the most common Gemini text failures.
        const defaultLegibilityNegatives = [
            'blurry text',
            'gibberish text',
            'misspelled words',
            'invented words',
            'overlapping letters',
            'distorted characters',
            'doubled or duplicated letters',
            'warped typography',
            'tiny unreadable text',
            'low contrast text',
            'cut-off letters',
            'text that runs off the edge',
            'decorative or script fonts',
            'mismatched character heights',
        ];

        const mergedNegativePrompt = [negativePrompt?.trim(), ...defaultLegibilityNegatives]
            .filter((v): v is string => Boolean(v))
            .join(', ');

        const buildPrompt = (strictTextMode: boolean): string => {
            let typographyRules = `
Typography requirements (highest priority — text quality is critical):
- Decide what text belongs on this slide based on the content request and global rules. Render it directly into the image.
- Use a clean, modern sans-serif typeface (e.g. resembling Inter, Helvetica, or Söhne). No decorative, script, or display fonts.
- Spelling must be 100% accurate. Every word must be a real, correctly-spelled English word — no invented or partial letterforms.
- Letterforms must be uniform: consistent x-height, baseline, weight, and spacing within each text block. No doubled, warped, broken, or fused glyphs.
- Maintain strong contrast between text and background (light text on dark backgrounds, or dark text on light). If the area behind text is busy, add a subtle solid or gradient backing so every character stays legible.
- Keep all text horizontal and fully inside the slide bounds. Never let letters touch or cross the slide edge.
- Establish a clear hierarchy: the main heading should be the largest and most prominent text element; supporting text smaller and visually secondary.
- Prefer concise wording. If the concept implies a list, render at most 3–5 short bullets. If it's a hero/title slide, a single headline plus a short subtitle is sufficient.
- Place text in uncluttered regions of the composition with comfortable padding around each text block.`.trim();

            if (strictTextMode) {
                typographyRules += '\n- STRICT RETRY MODE: simplify the area around text, enlarge the text blocks, and double-check spelling letter-by-letter. Prioritize legibility over visual flourish.';
            }

            const variationInstruction = totalVariations > 1
                ? `
Variation directive:
- Generate variation ${variationIndex} of ${totalVariations}.
- Keep the same slide message and overall style.
- Vary composition, imagery emphasis, or visual treatment so this version feels distinct from the others.
- Do not change the factual content or meaning.`
                : '';

            const parsedZones = Array.isArray(reservedZones) ? reservedZones : [];
            const reservedZonesInstruction = parsedZones.length > 0
                ? `
Reserved zones (CRITICAL — highest priority):
These areas will have graphic overlays composited on top after generation.
Do NOT place any text, important imagery, or key visual elements in these regions.
Keep these zones clear — use plain background, subtle texture, or empty space only.
${parsedZones.map((z: { xPct: number; yPct: number; widthPct: number; heightPct: number }, i: number) => {
    const left = Math.round(z.xPct * 100);
    const top = Math.round(z.yPct * 100);
    const right = Math.round((z.xPct + z.widthPct) * 100);
    const bottom = Math.round((z.yPct + z.heightPct) * 100);
    return `- Zone ${i + 1}: from (${left}%, ${top}%) to (${right}%, ${bottom}%) of the image — keep this area clear.`;
}).join('\n')}`
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
${reservedZonesInstruction}

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
