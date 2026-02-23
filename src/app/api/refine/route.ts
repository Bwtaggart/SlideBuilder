import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
    try {
        const { currentImageBase64, chatHistory, newMessage } = await req.json();

        if (!currentImageBase64 || !newMessage) {
            return NextResponse.json(
                { error: 'Current image and message are required' },
                { status: 400 }
            );
        }

        // Build conversational context
        let contextPrompt = '';
        if (chatHistory && chatHistory.length > 0) {
            const recentHistory = chatHistory.slice(-6); // Last 6 messages for context
            contextPrompt = 'Previous conversation:\n' +
                recentHistory.map((m: { role: string; content: string }) =>
                    `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
                ).join('\n') + '\n\n';
        }

        const contents = [
            {
                text: `${contextPrompt}You are an AI image editor. The user wants to modify this presentation slide image. User request: "${newMessage}". Edit the image accordingly while maintaining its overall style and quality. Describe what changes you made.`,
            },
            {
                inlineData: {
                    mimeType: 'image/png',
                    data: currentImageBase64,
                },
            },
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents,
            config: {
                responseModalities: ['Text', 'Image'],
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

        return NextResponse.json({
            imageBase64: imageBase64 || null,
            text: responseText || 'I processed your request.',
        });
    } catch (error: unknown) {
        console.error('Refine error:', error);
        const err = error as { status?: number; message?: string };

        if (err.status === 400 || err.status === 403) {
            return NextResponse.json(
                { error: 'Safety Policy: Cannot process this request. Please use generic terms.' },
                { status: err.status }
            );
        }

        return NextResponse.json({ error: err.message || 'Refinement failed' }, { status: 500 });
    }
}
