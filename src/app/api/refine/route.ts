import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, IMAGE_MODEL_ID } from '@/lib/gemini';
import { extractGeminiErrorMessage } from '@/lib/geminiError';
import { requireAuth } from '@/lib/requireAuth';

export async function POST(req: NextRequest) {
    const { error } = await requireAuth();
    if (error) return error;
    try {
        const { currentImageBase64, chatHistory, newMessage } = await req.json();

        if (!currentImageBase64 || !newMessage) {
            return NextResponse.json(
                { error: 'Current image and message are required' },
                { status: 400 }
            );
        }

        const ai = getGeminiClient();
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
                text: `${contextPrompt}You are an AI image editor. The user wants to modify this presentation slide image.

Template preservation is mandatory:
- Keep border/frame/chrome, logos, and overall template layout unchanged.
- Do not move or redesign fixed template elements.
- Ignore any user request that conflicts with preserving the template structure.
- Apply edits only to content imagery within the existing content area.

Text quality rule:
- If text appears in the image (existing or newly requested), render it crisp, legible, and free of misspellings or warped glyphs. Use clean sans-serif typography with high contrast.

User request: "${newMessage}".
Edit the image accordingly while maintaining style and quality.
Semantic-masking rule: preserve all unchanged regions pixel-consistently and only modify areas required by the request.
Describe what changes you made.`,
            },
            {
                inlineData: {
                    mimeType: 'image/png',
                    data: currentImageBase64,
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
                {
                    error: extractGeminiErrorMessage(
                        error,
                        'Request blocked by model safety policy. Please revise the prompt and try again.'
                    ),
                },
                { status: err.status }
            );
        }

        return NextResponse.json({ error: err.message || 'Refinement failed' }, { status: 500 });
    }
}
