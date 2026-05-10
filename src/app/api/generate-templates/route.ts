import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, IMAGE_MODEL_ID } from '@/lib/gemini';
import { extractGeminiErrorMessage } from '@/lib/geminiError';

export async function POST(req: NextRequest) {
    try {
        const { globalPrompt, negativePrompt, aspectRatio } = await req.json();

        if (!globalPrompt) {
            return NextResponse.json({ error: 'Global prompt is required' }, { status: 400 });
        }

        const ai = getGeminiClient();
        // Generate 4 template variations with slightly different prompts
        const variations = [
            `Create a professional presentation slide template. ${globalPrompt}. Clean layout with space for title and content. Variation 1: emphasize bold geometric shapes.${negativePrompt ? ` Avoid: ${negativePrompt}` : ''}`,
            `Create a professional presentation slide template. ${globalPrompt}. Clean layout with space for title and content. Variation 2: emphasize smooth gradients and flowing lines.${negativePrompt ? ` Avoid: ${negativePrompt}` : ''}`,
            `Create a professional presentation slide template. ${globalPrompt}. Clean layout with space for title and content. Variation 3: emphasize minimal design with strong typography focus.${negativePrompt ? ` Avoid: ${negativePrompt}` : ''}`,
            `Create a professional presentation slide template. ${globalPrompt}. Clean layout with space for title and content. Variation 4: emphasize rich textures and depth.${negativePrompt ? ` Avoid: ${negativePrompt}` : ''}`,
        ];

        // Fire all 4 in parallel
        const results = await Promise.allSettled(
            variations.map((prompt) =>
                ai.models.generateContent({
                    model: IMAGE_MODEL_ID,
                    contents: prompt,
                    config: {
                        responseModalities: ['Text', 'Image'],
                        imageConfig: {
                            aspectRatio: aspectRatio || '16:9',
                        },
                    },
                })
            )
        );

        const images: { id: string; base64: string }[] = [];

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.status === 'fulfilled') {
                const response = result.value;
                if (response.candidates?.[0]?.content?.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData) {
                            images.push({
                                id: `template-${i}-${Date.now()}`,
                                base64: part.inlineData.data!,
                            });
                            break; // Only take the first image from each response
                        }
                    }
                }
            } else {
                console.error(`Template ${i} failed:`, result.reason);
                const error = result.reason;
                if (error?.status === 400 || error?.status === 403 || error?.message?.includes('safety')) {
                    return NextResponse.json(
                        {
                            error: extractGeminiErrorMessage(
                                error,
                                'Request blocked by model safety policy. Please revise the prompt and try again.'
                            ),
                        },
                        { status: error?.status === 403 ? 403 : 400 }
                    );
                }
            }
        }

        if (images.length === 0) {
            return NextResponse.json(
                { error: 'No images were generated. Try a different prompt.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ images });
    } catch (error: unknown) {
        console.error('Generate templates error:', error);
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

        return NextResponse.json(
            { error: err.message || 'Failed to generate templates' },
            { status: 500 }
        );
    }
}
