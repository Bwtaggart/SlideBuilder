import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, IMAGE_MODEL_ID } from '@/lib/gemini';
import { extractGeminiErrorMessage } from '@/lib/geminiError';
import { requireAuth } from '@/lib/requireAuth';

export async function POST(req: NextRequest) {
    const { error } = await requireAuth();
    if (error) return error;
    try {
        const { imageBase64, maskBounds, prompt } = await req.json();

        if (!imageBase64 || !maskBounds || !prompt) {
            return NextResponse.json(
                { error: 'Image, mask bounds, and prompt are all required' },
                { status: 400 }
            );
        }

        const ai = getGeminiClient();
        // Convert percentage-based mask bounds to description for the model
        const { x, y, width, height } = maskBounds;
        const regionDesc = `The region to modify is approximately at position (${Math.round(x)}%, ${Math.round(y)}%) from the top-left, spanning ${Math.round(width)}% wide and ${Math.round(height)}% tall of the image.`;

        const contents = [
            {
                text: `Edit this image. Only modify the specific region described below, keeping everything else exactly the same. ${regionDesc} In that region: ${prompt}. Make the edit seamless and natural-looking, matching the surrounding style perfectly. If the edit involves text, render every letter crisp and legible with clean sans-serif typography, accurate spelling, and high contrast against the surrounding image — no warped, doubled, or misspelled glyphs.`,
            },
            {
                inlineData: {
                    mimeType: 'image/png',
                    data: imageBase64,
                },
            },
        ];

        const response = await ai.models.generateContent({
            model: IMAGE_MODEL_ID,
            contents,
            config: {
                responseModalities: ['Text', 'Image'],
            },
        });

        let resultBase64 = '';

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    resultBase64 = part.inlineData.data!;
                    break;
                }
            }
        }

        if (!resultBase64) {
            return NextResponse.json(
                { error: 'No image was generated. Try a different prompt.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ imageBase64: resultBase64 });
    } catch (error: unknown) {
        console.error('Inpaint error:', error);
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

        return NextResponse.json({ error: err.message || 'Inpainting failed' }, { status: 500 });
    }
}
