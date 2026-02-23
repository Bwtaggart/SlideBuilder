'use client';

import { Check, ArrowRight } from 'lucide-react';
import { usePresentationStore } from '@/store/presentationStore';

export default function TemplateGallery() {
    const { templateImages, selectedTemplate, setSelectedTemplate, setStep } = usePresentationStore();

    const handleContinue = () => {
        if (selectedTemplate) {
            setStep(3);
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px', animation: 'fade-in 0.4s ease-out' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
                    Choose Your <span className="glow-text">Template</span>
                </h1>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 15 }}>
                    Select a base template. All your slides will inherit this visual style.
                </p>
            </div>

            {/* 2x2 Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 16,
                    marginBottom: 32,
                }}
            >
                {templateImages.map((img) => {
                    const isSelected = selectedTemplate?.id === img.id;
                    return (
                        <button
                            key={img.id}
                            onClick={() => setSelectedTemplate(img)}
                            style={{
                                position: 'relative',
                                aspectRatio: '16/10',
                                borderRadius: 12,
                                overflow: 'hidden',
                                border: isSelected
                                    ? '2px solid var(--color-accent-cyan)'
                                    : '2px solid var(--color-border-default)',
                                cursor: 'pointer',
                                transition: 'all 0.25s ease',
                                background: 'var(--color-bg-card)',
                                boxShadow: isSelected
                                    ? '0 0 24px rgba(0,212,255,0.25), inset 0 0 20px rgba(0,212,255,0.05)'
                                    : 'none',
                                padding: 0,
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={`data:image/png;base64,${img.base64}`}
                                alt="Template option"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block',
                                }}
                            />
                            {/* Selected Check */}
                            {isSelected && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 10,
                                        right: 10,
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        background: 'var(--color-accent-cyan)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 0 12px rgba(0,212,255,0.5)',
                                    }}
                                >
                                    <Check size={16} style={{ color: 'var(--color-bg-primary)' }} />
                                </div>
                            )}
                            {/* Hover overlay */}
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: isSelected
                                        ? 'rgba(0,212,255,0.08)'
                                        : 'transparent',
                                    transition: 'background 0.2s ease',
                                }}
                            />
                        </button>
                    );
                })}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="btn-secondary" onClick={() => usePresentationStore.getState().setStep(1)}>
                    ← Back to Prompts
                </button>
                <button
                    className="btn-primary"
                    onClick={handleContinue}
                    disabled={!selectedTemplate}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        opacity: selectedTemplate ? 1 : 0.5,
                    }}
                >
                    Continue to Builder
                    <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
}
