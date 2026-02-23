import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * POST /api/analyze-template
 * Accepts an uploaded image (base64), analyzes it with Gemini Vision,
 * and returns auto-generated prompts describing the slide's style.
 */
export async function POST(req: NextRequest) {
    try {
        const { imageBase64, mimeType } = await req.json();

        if (!imageBase64) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const systemInstruction = `You are an expert presentation design analyst. Given a slide or graphic image, analyze its visual characteristics and generate prompts for recreating slides in this style.

You MUST respond as valid JSON with exactly these fields:
{
  "globalPrompt": "A detailed prompt describing the overall visual style, including: color palette (specific colors), typography style, background treatment, graphic elements, layout approach, visual mood/tone, and any distinctive design patterns",
  "negativePrompt": "Things to avoid that would clash with this style",
  "slideDescription": "A one-paragraph summary of what this slide depicts and its purpose"
}

Rules:
- Be extremely specific about colors (use descriptive terms like "deep navy blue", "warm amber gold")
- Mention typography characteristics (serif/sans-serif, weight, case)
- Describe background treatment (gradient direction, texture, patterns)
- Note any recurring design elements (geometric shapes, lines, icons style)
- The globalPrompt should be detailed enough to recreate the style from scratch
- Keep the negativePrompt focused on stylistic elements that would clash`;

        // Strip the data URI prefix if present
        let base64Data = imageBase64;
        let detectedMime = mimeType || 'image/png';
        if (base64Data.startsWith('data:')) {
            const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
                detectedMime = match[1];
                base64Data = match[2];
            }
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            inlineData: {
                                mimeType: detectedMime,
                                data: base64Data,
                            },
                        },
                        {
                            text: 'Analyze this slide/graphic and generate the JSON response as instructed.',
                        },
                    ],
                },
            ],
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
            },
        });

        const text = response.text || '';

        // Parse the JSON response
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            // Try extracting JSON from markdown code blocks
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[1].trim());
            } else {
                throw new Error('Failed to parse AI response');
            }
        }

        return NextResponse.json({
            globalPrompt: parsed.globalPrompt || '',
            negativePrompt: parsed.negativePrompt || '',
            slideDescription: parsed.slideDescription || '',
            tokensUsed: 500, // Approximate
        });
    } catch (error) {
        console.error('Analyze template error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Analysis failed' },
            { status: 500 }
        );
    }
}
