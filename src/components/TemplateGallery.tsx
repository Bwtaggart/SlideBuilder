'use client';

import { useRef, useCallback } from 'react';
import { Check, ArrowRight, LayoutTemplate, Upload } from 'lucide-react';
import { usePresentationStore } from '@/store/presentationStore';
import { BLANK_TEMPLATE_ID, createBlankTemplate, isBlankTemplate } from '@/lib/template';
import { putTemplate } from '@/lib/idb';
import { useToast } from './Toast';

export default function TemplateGallery() {
    const { templateImages, selectedTemplate, setSelectedTemplate, setTemplateImages, setStep, aspectRatio } = usePresentationStore();
    const { showToast } = useToast();
    const blankTemplate = createBlankTemplate(aspectRatio);
    const uploadRef = useRef<HTMLInputElement>(null);

    const handleContinue = () => {
        if (selectedTemplate) {
            setStep(3);
        }
    };

    const handleDirectUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                const idx = result.indexOf(',');
                resolve(idx >= 0 ? result.substring(idx + 1) : result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        const id = `upload-${Date.now()}`;
        const newTemplate = { id, base64 };
        setTemplateImages([...templateImages, newTemplate]);
        setSelectedTemplate(newTemplate);
        await putTemplate({ id, base64, createdAt: Date.now() });
        showToast('success', 'Template Uploaded', `"${file.name}" added as a template.`);
    }, [templateImages, setTemplateImages, setSelectedTemplate, showToast]);

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
                <button
                    key={BLANK_TEMPLATE_ID}
                    onClick={() => setSelectedTemplate(blankTemplate)}
                    style={{
                        position: 'relative',
                        aspectRatio: '16/10',
                        borderRadius: 12,
                        overflow: 'hidden',
                        border: isBlankTemplate(selectedTemplate)
                            ? '2px solid var(--color-accent-cyan)'
                            : '2px solid var(--color-border-default)',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        background: 'linear-gradient(180deg, rgba(13,18,32,0.98), rgba(8,11,20,0.98))',
                        boxShadow: isBlankTemplate(selectedTemplate)
                            ? '0 0 24px rgba(0,212,255,0.25), inset 0 0 20px rgba(0,212,255,0.05)'
                            : 'none',
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                    }}
                >
                    <div
                        style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0,212,255,0.08)',
                            border: '1px solid rgba(0,212,255,0.18)',
                        }}
                    >
                        <LayoutTemplate size={20} style={{ color: 'var(--color-accent-cyan)' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                            Blank Canvas
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                            Build slides from scratch with no locked frame. Your global prompt will define the visual style.
                        </p>
                    </div>
                    {isBlankTemplate(selectedTemplate) && (
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
                </button>
                {/* Upload Template Card */}
                <button
                    onClick={() => uploadRef.current?.click()}
                    style={{
                        position: 'relative',
                        aspectRatio: '16/10',
                        borderRadius: 12,
                        overflow: 'hidden',
                        border: '2px dashed var(--color-border-default)',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        background: 'var(--color-bg-secondary)',
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                    }}
                >
                    <div
                        style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0,212,255,0.08)',
                            border: '1px solid rgba(0,212,255,0.18)',
                        }}
                    >
                        <Upload size={20} style={{ color: 'var(--color-accent-cyan)' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                            Upload Template
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                            Use your own background image as-is. No AI analysis — straight to the builder.
                        </p>
                    </div>
                </button>
                <input
                    ref={uploadRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleDirectUpload}
                />
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
