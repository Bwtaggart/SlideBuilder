import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, TEXT_MODEL_ID } from '@/lib/gemini';

export async function POST(req: NextRequest) {
    try {
        const { slideConceptPrompt } = await req.json();

        if (!slideConceptPrompt) {
            return NextResponse.json(
                { error: 'Slide concept prompt is required' },
                { status: 400 }
            );
        }

        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
            model: TEXT_MODEL_ID,
            contents: `You are a presentation coach. Given this slide concept, generate exactly 3 concise speaker notes bullet points meant to be read aloud during a presentation. Keep each bullet to 1-2 sentences maximum. Be conversational but professional.

Slide concept: ${slideConceptPrompt}

Respond with just the 3 bullet points, each on a new line starting with "•". Do not include any other text.`,
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Rough token estimate from the response
        const tokensUsed = Math.ceil((slideConceptPrompt.length + text.length) / 4);

        return NextResponse.json({
            notes: text.trim(),
            tokensUsed,
        });
    } catch (error: unknown) {
        console.error('Generate notes error:', error);
        const err = error as { message?: string };
        return NextResponse.json(
            { error: err.message || 'Failed to generate speaker notes' },
            { status: 500 }
        );
    }
}
