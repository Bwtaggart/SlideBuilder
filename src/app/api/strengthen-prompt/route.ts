import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, TEXT_MODEL_ID } from '@/lib/gemini';
import { requireAuth } from '@/lib/requireAuth';

export async function POST(req: NextRequest) {
    const { error } = await requireAuth();
    if (error) return error;
    try {
        const { prompt, context } = await req.json();

        if (!prompt || !prompt.trim()) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const normalizeContext = (value: unknown): string => {
            return typeof value === 'string' ? value.toLowerCase() : '';
        };

        const modeFromContext = (value: string): 'global' | 'negative' | 'slide' | 'generic' => {
            if (value.includes('negative prompt')) return 'negative';
            if (value.includes('global')) return 'global';
            if (value.includes('slide concept')) return 'slide';
            return 'generic';
        };

        const mode = modeFromContext(normalizeContext(context));

        const modeInstructionMap: Record<typeof mode, string> = {
            global: `Output format (single paragraph, 3-5 sentences, no headings):
- Sentence 1: visual style + tone.
- Sentence 2: composition/layout guidance.
- Sentence 3: typography and readability constraints.
- Sentence 4+: color/material/mood specifics and production-quality constraints.
Required language:
- Use concrete directives such as "Use", "Keep", "Place", "Maintain", "Avoid".
- Use full narrative sentences, not keyword lists.
- Explicitly describe relationships between major elements (foreground/background, left/right/center).
- No hedging words (maybe, could, try, might, etc.).
- Keep template compatibility by favoring central-content changes over frame/chrome changes.`,
            negative: `Output format (single line, comma-separated phrases):
- 12-24 explicit exclusions only.
- Each phrase should be concise and concrete (e.g., "illegible tiny text", "warped letters", "cluttered layout").
Required language:
- No explanations.
- No full sentences.
- No positive instructions; only exclusions.`,
            slide: `Output format (single paragraph, 4-6 sentences, no headings):
- Sentence 1: primary subject + objective of the slide visual.
- Sentence 2: composition and focal hierarchy.
- Sentence 3: text treatment and legibility constraints.
- Sentence 4: data/icon/diagram treatment where relevant.
- Sentence 5+: lighting/color/finish details.
Required language:
- Include explicit constraints for readable title/subtitle/bullets.
- Use full narrative sentences, not disconnected tags.
- Specify spatial relationships where useful (left/right/center/top/bottom).
- Include at least one concrete technical directing cue (camera angle, lighting, or material texture) when it improves clarity.
- Use concrete directives; no hedging words.
- Keep directions unambiguous and executable.`,
            generic: `Output format (single paragraph, 3-5 sentences):
- Provide concrete, specific generation directives.
- Include composition, typography/readability, and style constraints.
Required language:
- Use directive verbs and avoid hedging words.
- Use narrative sentence structure and explicit object relationships.
- Do not include explanations or meta commentary.`,
        };

        const ai = getGeminiClient();
        const systemInstruction = `You are a deterministic prompt refiner for AI slide/image generation.

Primary goal:
- Convert rough prompts into precise, low-ambiguity directives that improve consistency.

Universal rules:
- Preserve the user's intent and domain terms.
- Prefer explicit constraints over creative adjectives.
- Eliminate ambiguity and underspecified language.
- Convert fragmented or comma-separated "tag soup" input into coherent narrative directives.
- Avoid hallucinated brand names, copyrighted characters, or real people unless explicitly requested.
- Return ONLY the strengthened prompt text, no markdown, no quotes, no preface.`;

        const response = await ai.models.generateContent({
            model: TEXT_MODEL_ID,
            contents: `${context ? `Context: ${context}\n` : ''}Mode: ${mode}\n\nRefinement requirements:\n${modeInstructionMap[mode]}\n\nOriginal prompt:\n${prompt}`,
            config: {
                systemInstruction,
                temperature: 0.2,
                topP: 0.8,
            },
        });

        const strengthenedRaw = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || prompt;
        const strengthened = strengthenedRaw.replace(/^["']|["']$/g, '').trim();
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
