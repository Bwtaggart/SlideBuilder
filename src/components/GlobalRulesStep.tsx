'use client';

import { useState, useRef, useCallback } from 'react';
import { Sparkles, Wand2, ShieldAlert, Upload, Image as ImageIcon } from 'lucide-react';
import { usePresentationStore } from '@/store/presentationStore';
import { useCostStore } from '@/store/costStore';
import { useToast } from './Toast';
import PromptStrengthener from './PromptStrengthener';
import type { AspectRatio } from '@/lib/types';
import { createBlankTemplate } from '@/lib/template';
import { putTemplate } from '@/lib/idb';

const aspectRatios: { value: AspectRatio; label: string }[] = [
    { value: '16:9', label: '16:9 — Widescreen' },
    { value: '4:3', label: '4:3 — Standard' },
    { value: '9:16', label: '9:16 — Portrait' },
];

export default function GlobalRulesStep() {
    const {
        globalPrompt,
        negativePrompt,
        aspectRatio,
        setGlobalPrompt,
        setNegativePrompt,
        setAspectRatio,
        setTemplateImages,
        setSelectedTemplate,
        setIsGeneratingTemplates,
        isGeneratingTemplates,
        setStep,
    } = usePresentationStore();
    const { addCost } = useCostStore();
    const { showToast } = useToast();
    const [error, setError] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const directUploadRef = useRef<HTMLInputElement>(null);

    const handleGenerate = async () => {
        if (!globalPrompt.trim()) {
            setError('Please enter a global prompt to describe your presentation style.');
            return;
        }
        setError('');
        setIsGeneratingTemplates(true);

        try {
            setSelectedTemplate(null);
            const res = await fetch('/api/generate-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ globalPrompt, negativePrompt, aspectRatio }),
            });

            if (!res.ok) {
                const data = await res.json();
                if (res.status === 400 || res.status === 403) {
                    showToast('warning', 'Safety Policy', data.error || 'Cannot generate images with the provided prompt. Please use generic terms.');
                    return;
                }
                throw new Error(data.error || 'Failed to generate templates');
            }

            const data = await res.json();
            setTemplateImages(data.images);
            addCost('nano_banana_image', data.images.length);
            setStep(2);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'An error occurred';
            showToast('error', 'Generation Failed', msg);
        } finally {
            setIsGeneratingTemplates(false);
        }
    };

    const handleFileUpload = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            showToast('error', 'Invalid File', 'Please upload an image file (PNG, JPG, WebP).');
            return;
        }

        // Max 10MB
        if (file.size > 10 * 1024 * 1024) {
            showToast('error', 'File Too Large', 'Please upload an image under 10MB.');
            return;
        }

        setIsAnalyzing(true);
        setError('');

        try {
            // Read file as base64
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            setUploadedPreview(base64);

            // Send to Gemini for analysis
            const res = await fetch('/api/analyze-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Analysis failed');
            }

            const data = await res.json();

            // Auto-populate prompts
            setGlobalPrompt(data.globalPrompt);
            if (data.negativePrompt) setNegativePrompt(data.negativePrompt);

            // Set the uploaded image as the selected template
            const templateId = `upload-${Date.now()}`;
            const template = { id: templateId, base64: base64.replace(/^data:[^;]+;base64,/, '') };
            setTemplateImages([template]);
            setSelectedTemplate(template);

            addCost('gemini_text', Number(data.tokensUsed) || 500);
            showToast('success', 'Template Analyzed', `Style learned from "${file.name}". Prompts auto-generated.`);

            // Jump straight to Slide Builder
            setTimeout(() => {
                setStep(3);
            }, 800);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to analyze template';
            showToast('error', 'Analysis Failed', msg);
            setUploadedPreview(null);
        } finally {
            setIsAnalyzing(false);
        }
    }, [setGlobalPrompt, setNegativePrompt, setTemplateImages, setSelectedTemplate, setStep, addCost, showToast]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    }, [handleFileUpload]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => setIsDragOver(false);

    const handleDirectUpload = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            showToast('error', 'Invalid File', 'Please upload an image file (PNG, JPG, WebP).');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast('error', 'File Too Large', 'Please upload an image under 10MB.');
            return;
        }

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

        const templateId = `upload-${Date.now()}`;
        const template = { id: templateId, base64 };
        setTemplateImages([template]);
        setSelectedTemplate(template);
        await putTemplate({ id: templateId, base64, createdAt: Date.now() });
        showToast('success', 'Template Uploaded', `"${file.name}" set as background template.`);
        setTimeout(() => setStep(3), 400);
    }, [setTemplateImages, setSelectedTemplate, setStep, showToast]);

    const handleStartBlank = () => {
        const blankTemplate = createBlankTemplate(aspectRatio);
        setTemplateImages([]);
        setSelectedTemplate(blankTemplate);
        setStep(3);
    };

    return (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', animation: 'fade-in 0.4s ease-out' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
                <div
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: 16,
                        background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(59,130,246,0.15))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        border: '1px solid rgba(0,212,255,0.2)',
                    }}
                >
                    <Wand2 size={28} className="glow-text" />
                </div>
                <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
                    Define Your <span className="glow-text">Vision</span>
                </h1>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, maxWidth: 460, margin: '0 auto' }}>
                    Describe your style below, or upload an existing slide to learn from it.
                </p>
            </div>

            {/* ─── Upload Template Zones ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
                {/* Direct upload — no analysis */}
                <div>
                    <label className="label">
                        <Upload size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                        Upload Background Template
                    </label>
                    <div
                        onClick={() => directUploadRef.current?.click()}
                        style={{
                            border: '2px dashed var(--color-border-default)',
                            borderRadius: 12,
                            padding: '32px 24px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: 'var(--color-bg-secondary)',
                            transition: 'all 0.2s ease',
                            minHeight: 140,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <ImageIcon size={28} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 4 }}>
                            Use as-is, <span style={{ color: 'var(--color-accent-cyan)' }}>click to browse</span>
                        </p>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                            No AI analysis — jumps straight to builder
                        </p>
                    </div>
                    <input
                        ref={directUploadRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDirectUpload(file);
                            e.target.value = '';
                        }}
                    />
                </div>

                {/* Analyze upload — AI learns style */}
                <div>
                    <label className="label">
                        <Sparkles size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                        Upload &amp; Analyze Reference
                    </label>
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                        style={{
                            border: `2px dashed ${isDragOver ? 'var(--color-accent-cyan)' : 'var(--color-border-default)'}`,
                            borderRadius: 12,
                            padding: uploadedPreview ? 0 : '32px 24px',
                            textAlign: 'center',
                            cursor: isAnalyzing ? 'wait' : 'pointer',
                            background: isDragOver ? 'rgba(0,212,255,0.05)' : 'var(--color-bg-secondary)',
                            transition: 'all 0.2s ease',
                            overflow: 'hidden',
                            minHeight: 140,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {isAnalyzing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                                <span style={{ color: 'var(--color-accent-cyan)', fontSize: 13, fontWeight: 500 }}>
                                    Analyzing with Gemini...
                                </span>
                            </div>
                        ) : uploadedPreview ? (
                            <div style={{ position: 'relative', aspectRatio: '16/9', width: '100%' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={uploadedPreview}
                                    alt="Uploaded template"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    bottom: 8,
                                    right: 8,
                                    background: 'rgba(0,0,0,0.7)',
                                    borderRadius: 6,
                                    padding: '4px 10px',
                                    fontSize: 11,
                                    color: 'var(--color-accent-green)',
                                    fontWeight: 500,
                                }}>
                                    Analyzed
                                </div>
                            </div>
                        ) : (
                            <>
                                <ImageIcon size={28} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 4 }}>
                                    AI learns style, <span style={{ color: 'var(--color-accent-cyan)' }}>click to browse</span>
                                </p>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                                    Auto-generates prompts from your image
                                </p>
                            </>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                        }}
                    />
                </div>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border-subtle)' }} />
                <span style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    or describe manually
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border-subtle)' }} />
            </div>

            {/* Global Prompt */}
            <div style={{ marginBottom: 24 }}>
                <label className="label" htmlFor="global-prompt">
                    <Sparkles size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    Global Style Prompt
                    <PromptStrengthener value={globalPrompt} onResult={setGlobalPrompt} context="global presentation style prompt for AI image generation" />
                </label>
                <textarea
                    id="global-prompt"
                    className="textarea-field"
                    value={globalPrompt}
                    onChange={(e) => setGlobalPrompt(e.target.value)}
                    placeholder="e.g., A sleek corporate pitch deck with dark blue gradients, geometric patterns, and clean white typography. Professional and modern."
                    style={{ minHeight: 140 }}
                />
            </div>

            {/* Negative Prompt */}
            <div style={{ marginBottom: 24 }}>
                <label className="label" htmlFor="negative-prompt">
                    <ShieldAlert size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    Negative Prompt <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                    <PromptStrengthener value={negativePrompt} onResult={setNegativePrompt} context="negative prompt — things to avoid in AI image generation" />
                </label>
                <textarea
                    id="negative-prompt"
                    className="textarea-field"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="e.g., No cartoonish elements, no bright neon colors, no clip art, avoid childish designs"
                    style={{ minHeight: 80 }}
                />
            </div>

            {/* Aspect Ratio */}
            <div style={{ marginBottom: 32 }}>
                <label className="label">Aspect Ratio</label>
                <div style={{ display: 'flex', gap: 10 }}>
                    {aspectRatios.map((ar) => (
                        <button
                            key={ar.value}
                            onClick={() => setAspectRatio(ar.value)}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                borderRadius: 8,
                                border: `1px solid ${aspectRatio === ar.value ? 'var(--color-accent-cyan)' : 'var(--color-border-default)'}`,
                                background: aspectRatio === ar.value ? 'rgba(0,212,255,0.08)' : 'var(--color-bg-secondary)',
                                color: aspectRatio === ar.value ? 'var(--color-accent-cyan)' : 'var(--color-text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontFamily: 'var(--font-mono)',
                                fontSize: 13,
                                fontWeight: 500,
                            }}
                        >
                            {ar.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{ color: 'var(--color-accent-red)', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
                    {error}
                </div>
            )}

            {/* Generate Button */}
            <button
                className="btn-primary"
                onClick={handleGenerate}
                disabled={isGeneratingTemplates}
                style={{
                    width: '100%',
                    padding: '14px 24px',
                    fontSize: 15,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                }}
            >
                {isGeneratingTemplates ? (
                    <>
                        <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                        Generating Templates...
                    </>
                ) : (
                    <>
                        <Sparkles size={16} />
                        Generate Templates
                    </>
                )}
            </button>

            <button
                className="btn-secondary"
                onClick={handleStartBlank}
                disabled={isGeneratingTemplates || isAnalyzing}
                style={{
                    width: '100%',
                    marginTop: 12,
                    padding: '14px 24px',
                    fontSize: 15,
                }}
            >
                Start with Blank Canvas
            </button>
        </div>
    );
}
