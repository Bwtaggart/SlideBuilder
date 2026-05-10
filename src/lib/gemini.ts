import { GoogleGenAI } from '@google/genai';

export const IMAGE_MODEL_ID = process.env.IMAGE_MODEL_ID || 'gemini-3-pro-image-preview';
export const TEXT_MODEL_ID = process.env.TEXT_MODEL_ID || 'gemini-2.5-flash';

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    if (!geminiClient) {
        geminiClient = new GoogleGenAI({ apiKey });
    }

    return geminiClient;
}
