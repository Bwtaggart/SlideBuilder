import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, IMAGE_MODEL_ID } from '@/lib/gemini';
import { extractGeminiErrorMessage } from '@/lib/geminiError';

export async function POST(req: NextRequest) {
    try {
        const { imageBase64 } = await req.json();

        if (!imageBase64) {
            return NextResponse.json(
                { error: 'imageBase64 is required' },
                { status: 400 }
            );
        }

        const ai = getGeminiClient();

        const contents = [
            {
                text: 'Remove the background from this image. Keep only the foreground subject (logo, icon, text, or object). Replace the entire background with pure white (#FFFFFF). Do not alter, resize, or crop the foreground subject in any way. Output the result as an image.',
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
        let resultMimeType = 'image/png';

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    resultBase64 = part.inlineData.data!;
                    resultMimeType = part.inlineData.mimeType || 'image/png';
                    break;
                }
            }
        }

        if (!resultBase64) {
            return NextResponse.json(
                { error: 'Background removal failed. The model did not return an image.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ imageBase64: resultBase64, mimeType: resultMimeType });
    } catch (error: unknown) {
        console.error('Remove-bg error:', error);
        const err = error as { status?: number; message?: string };

        if (err.status === 400 || err.status === 403) {
            return NextResponse.json(
                {
                    error: extractGeminiErrorMessage(
                        error,
                        'Background removal was blocked by the model safety policy.'
                    ),
                },
                { status: err.status }
            );
        }

        return NextResponse.json(
            { error: err.message || 'Background removal failed' },
            { status: 500 }
        );
    }
}
