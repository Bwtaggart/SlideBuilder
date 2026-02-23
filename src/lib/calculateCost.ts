import type { ServiceType } from './types';

// ─── Nano Banana Pro (Gemini 3 Pro Image) ──────────────────────────
// Official API pricing: $0.134 per image at 2K resolution
const NANO_BANANA_PRO_COST_PER_IMAGE = 0.134;

// ─── Gemini 2.5 Flash (text) ───────────────────────────────────────
// Per-token pricing
const GEMINI_INPUT_COST_PER_TOKEN = 0.00001;
const GEMINI_OUTPUT_COST_PER_TOKEN = 0.00004;

/**
 * Calculate the dollar cost for a given API service usage.
 *
 * @param serviceType - 'nano_banana_image' or 'gemini_text'
 * @param usageAmount - For images: number of images generated. For text: total tokens.
 * @returns Dollar cost as a number
 */
export function calculateCost(serviceType: ServiceType, usageAmount: number): number {
    switch (serviceType) {
        case 'nano_banana_image':
            return NANO_BANANA_PRO_COST_PER_IMAGE * usageAmount;
        case 'gemini_text':
            // Rough estimate: assume 40% input, 60% output tokens
            const inputTokens = Math.floor(usageAmount * 0.4);
            const outputTokens = usageAmount - inputTokens;
            return (inputTokens * GEMINI_INPUT_COST_PER_TOKEN) + (outputTokens * GEMINI_OUTPUT_COST_PER_TOKEN);
        default:
            return 0;
    }
}

export function formatCost(cost: number): string {
    return `$${cost.toFixed(4)}`;
}
