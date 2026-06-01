import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, TEXT_MODEL_ID } from '@/lib/gemini';
import { requireAuth } from '@/lib/requireAuth';

export async function POST(req: NextRequest) {
    const { error } = await requireAuth();
    if (error) return error;
    try {
        const { imageBase64, slidePrompt } = await req.json();

        if (!imageBase64) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 });
        }

        const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');

        const ai = getGeminiClient();

        const systemInstruction = `You are a meticulous QA reviewer for AI-generated presentation slides. You are given a rendered slide image and the instruction it was generated from. Inspect the IMAGE carefully and report only real, clearly-visible problems. Do not invent issues; if the slide looks good, say so.

Check for:
- Spelling: misspelled words, invented/non-words, doubled or dropped letters, garbled text.
- Legibility: text too small to read, low contrast, text cut off or running off the slide edge, overlapping/warped letters.
- Instruction adherence: whether the slide reasonably reflects the requested content/instruction.

Return your assessment as JSON with this exact structure:
{
  "passedQA": boolean,            // true only if there are no meaningful issues
  "spellingIssues": string[],     // short human-readable descriptions, [] if none
  "instructionIssues": string[],  // [] if none
  "legibilityIssues": string[],   // [] if none
  "summary": string               // one short sentence
}
Each issue string should be concise (e.g., "'Stratergy' is misspelled — should be 'Strategy'"). Keep arrays empty when there are no issues.`;

        const userText = slidePrompt
            ? `Instruction the slide was generated from:\n${slidePrompt}\n\nReview the slide image for spelling, legibility, and instruction adherence.`
            : 'Review the slide image for spelling, legibility, and instruction adherence.';

        const response = await ai.models.generateContent({
            model: TEXT_MODEL_ID,
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: userText },
                        { inlineData: { mimeType: 'image/png', data: base64Data } },
                    ],
                },
            ],
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                temperature: 0.1,
            },
        });

        const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        let parsed: {
            passedQA?: boolean;
            spellingIssues?: string[];
            instructionIssues?: string[];
            legibilityIssues?: string[];
            summary?: string;
        } = {};
        try {
            parsed = JSON.parse(responseText);
        } catch {
            parsed = {};
        }

        const toStringArray = (v: unknown): string[] =>
            Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

        const spellingIssues = toStringArray(parsed.spellingIssues);
        const instructionIssues = toStringArray(parsed.instructionIssues);
        const legibilityIssues = toStringArray(parsed.legibilityIssues);
        const hasIssues = spellingIssues.length + instructionIssues.length + legibilityIssues.length > 0;
        // Trust an explicit false; otherwise derive from whether any issues were found.
        const passedQA = typeof parsed.passedQA === 'boolean' ? parsed.passedQA && !hasIssues : !hasIssues;

        const tokensUsed = response.usageMetadata?.totalTokenCount || 0;

        return NextResponse.json({
            passedQA,
            spellingIssues,
            instructionIssues,
            legibilityIssues,
            summary: typeof parsed.summary === 'string' ? parsed.summary : '',
            tokensUsed,
        });
    } catch (error: unknown) {
        console.error('QA check error:', error);
        const err = error as { message?: string };
        return NextResponse.json(
            { error: err.message || 'Failed to run QA check' },
            { status: 500 }
        );
    }
}
