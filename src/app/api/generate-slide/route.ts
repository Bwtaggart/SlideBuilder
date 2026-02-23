import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
    try {
        const { templateBase64, slidePrompt, title, bullets, aspectRatio, negativePrompt } = await req.json();

        if (!templateBase64 || !slidePrompt) {
            return NextResponse.json({ error: 'Template and slide prompt are required' }, { status: 400 });
        }

        // Build text rendering instructions
        let textOverlay = '';
        if (title) {
            textOverlay += `\nThe slide must prominently display the title text: "${title}"`;
        }
        if (bullets && bullets.length > 0) {
            textOverlay += `\nThe slide must include these bullet points rendered as legible text: ${bullets.map((b: string) => `"${b}"`).join(', ')}`;
        }

        const prompt = [
            {
                text: `Create a professional presentation slide using the exact visual style of this reference image. ${slidePrompt}${textOverlay}${negativePrompt ? ` Avoid: ${negativePrompt}` : ''}. The text must be clean, legible, and well-positioned.`,
            },
            {
                inlineData: {
                    mimeType: 'image/png',
                    data: templateBase64,
                },
            },
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: prompt,
            config: {
                responseModalities: ['Text', 'Image'],
                imageConfig: {
                    aspectRatio: aspectRatio || '16:9',
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

        if (!imageBase64) {
            return NextResponse.json({ error: 'No image was generated. Try a different prompt.' }, { status: 500 });
        }

        return NextResponse.json({ imageBase64, text: responseText });
    } catch (error: unknown) {
        console.error('Generate slide error:', error);
        const err = error as { status?: number; message?: string };

        if (err.status === 400 || err.status === 403) {
            return NextResponse.json(
                { error: 'Safety Policy: Cannot generate images of real political figures. Please use generic terms.' },
                { status: err.status }
            );
        }

        return NextResponse.json({ error: err.message || 'Failed to generate slide' }, { status: 500 });
    }
}
