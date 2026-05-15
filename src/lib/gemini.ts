import { GoogleGenAI } from '@google/genai';

export const IMAGE_MODEL_ID = process.env.IMAGE_MODEL_ID || 'gemini-3-pro-image-preview';
export const TEXT_MODEL_ID = process.env.TEXT_MODEL_ID || 'gemini-2.5-flash';

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
    if (!geminiClient) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            geminiClient = new GoogleGenAI({ apiKey });
        } else {
            const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
            const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
            if (!project) {
                throw new Error(
                    'Set GEMINI_API_KEY for API key auth, or GOOGLE_CLOUD_PROJECT for ADC/Vertex AI'
                );
            }
            geminiClient = new GoogleGenAI({ vertexai: true, project, location });
        }
    }
    return geminiClient;
}
