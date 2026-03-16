export function extractGeminiErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') return fallback;

    const err = error as {
        message?: unknown;
        error?: { message?: unknown; details?: unknown };
        details?: unknown;
    };

    const candidates: unknown[] = [
        err.message,
        err.error?.message,
        typeof err.details === 'string' ? err.details : undefined,
        typeof err.error?.details === 'string' ? err.error.details : undefined,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string') {
            const normalized = candidate.replace(/\s+/g, ' ').trim();
            if (normalized) return normalized.slice(0, 400);
        }
    }

    return fallback;
}
