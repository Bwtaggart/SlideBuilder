import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';

export async function POST(req: NextRequest) {
    try {
        const { prompt, context } = await req.json();

        if (!prompt || !prompt.trim()) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const ai = getGeminiClient();
        const systemInstruction = `You are a master prompt engineer specializing in AI image generation prompts. Your job is to take a user's rough prompt and transform it into a highly detailed, vivid, and effective prompt that will produce stunning results from an AI image generator.

Rules:
- Preserve the user's core intent and subject matter
- Add specific details: lighting, composition, color palette, mood, texture, style references
- Use precise descriptive language that image models respond well to
- Keep it to 2-3 sentences max — dense but not rambling
- Do NOT add any explanation, just return the improved prompt text
- If the context says "negative prompt", optimize it as a negative prompt (things to avoid)
- If the context says "slide concept", frame it as a presentation slide description`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${context ? `Context: ${context}\n\n` : ''}Original prompt: "${prompt}"\n\nReturn ONLY the strengthened prompt, nothing else.`,
            config: {
                systemInstruction,
            },
        });

        const strengthened = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || prompt;
        const tokensUsed = Math.ceil((prompt.length + strengthened.length) / 4);

        return NextResponse.json({ strengthened, tokensUsed });
    } catch (error: unknown) {
        console.error('Strengthen prompt error:', error);
        const err = error as { message?: string };
        return NextResponse.json(
            { error: err.message || 'Failed to strengthen prompt' },
            { status: 500 }
        );
    }
}
