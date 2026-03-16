import type { ServiceType } from './types';

// ─── Gemini 3 Pro Image Preview (4K) ────────────────────────────────
// Official API pricing (Standard tier):
// - Output image up to 4K: $0.24 per image
// - Image input charge equivalent: $0.0011 per image
// Keep service key `nano_banana_image` for backward compatibility.
const GEMINI_3_PRO_IMAGE_4K_OUTPUT_COST_PER_IMAGE = 0.24;
const GEMINI_3_PRO_IMAGE_INPUT_COST_PER_IMAGE = 0.0011;
const NANO_BANANA_PRO_COST_PER_IMAGE = GEMINI_3_PRO_IMAGE_4K_OUTPUT_COST_PER_IMAGE + GEMINI_3_PRO_IMAGE_INPUT_COST_PER_IMAGE;

// ─── Gemini 2.5 Flash (text) ───────────────────────────────────────
// Official API pricing (Standard tier): $0.30 input / $2.50 output per 1M tokens
const GEMINI_INPUT_COST_PER_TOKEN = 0.30 / 1_000_000;
const GEMINI_OUTPUT_COST_PER_TOKEN = 2.50 / 1_000_000;

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
