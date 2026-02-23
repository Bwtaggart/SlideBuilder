'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useCostStore } from '@/store/costStore';
import { useToast } from './Toast';

// Inline Gemini sparkle SVG icon
function GeminiIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M14 0C14 7.732 7.732 14 0 14C7.732 14 14 20.268 14 28C14 20.268 20.268 14 28 14C20.268 14 14 7.732 14 0Z"
                fill="url(#gemini-gradient)"
            />
            <defs>
                <linearGradient id="gemini-gradient" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4285F4" />
                    <stop offset="0.5" stopColor="#9B72CB" />
                    <stop offset="1" stopColor="#D96570" />
                </linearGradient>
            </defs>
        </svg>
    );
}

interface Props {
    value: string;
    onResult: (strengthened: string) => void;
    context?: string;
}

export default function PromptStrengthener({ value, onResult, context }: Props) {
    const [isStrengthening, setIsStrengthening] = useState(false);
    const { addCost } = useCostStore();
    const { showToast } = useToast();

    const handleStrengthen = async () => {
        if (!value.trim() || isStrengthening) return;
        setIsStrengthening(true);

        try {
            const res = await fetch('/api/strengthen-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: value, context }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to strengthen prompt');
            }

            const data = await res.json();
            onResult(data.strengthened);
            if (data.tokensUsed) {
                addCost('gemini_text', data.tokensUsed);
            }
            showToast('success', 'Prompt Strengthened', 'Your prompt has been enhanced by Gemini.');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'An error occurred';
            showToast('error', 'Strengthen Failed', msg);
        } finally {
            setIsStrengthening(false);
        }
    };

    return (
        <button
            onClick={handleStrengthen}
            disabled={!value.trim() || isStrengthening}
            title="Strengthen prompt with Gemini"
            style={{
                background: 'none',
                border: '1px solid transparent',
                borderRadius: 6,
                padding: 4,
                cursor: value.trim() && !isStrengthening ? 'pointer' : 'default',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                opacity: value.trim() ? 1 : 0.35,
                verticalAlign: 'middle',
                marginLeft: 6,
                position: 'relative',
            }}
            onMouseEnter={(e) => {
                if (value.trim()) {
                    e.currentTarget.style.borderColor = 'rgba(155, 114, 203, 0.4)';
                    e.currentTarget.style.background = 'rgba(155, 114, 203, 0.08)';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(155, 114, 203, 0.15)';
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {isStrengthening ? (
                <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite', color: '#9B72CB' }} />
            ) : (
                <GeminiIcon size={14} />
            )}
        </button>
    );
}
