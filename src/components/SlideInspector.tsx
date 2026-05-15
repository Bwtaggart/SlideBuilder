'use client';

import { useState, useCallback } from 'react';
import { Sparkles, MessageSquare, Loader2, Image as ImageIcon, Wand2, ShieldAlert } from 'lucide-react';
import { usePresentationStore } from '@/store/presentationStore';
import { useCostStore } from '@/store/costStore';
import { useToast } from './Toast';
import CanvasOverlay from './CanvasOverlay';
import RefinementChat from './RefinementChat';
import PromptStrengthener from './PromptStrengthener';
import type { BoundingBox, Slide } from '@/lib/types';

export default function SlideInspector() {
    const {
        slides,
        activeSlideIndex,
        updateSlide,
        insertSlidesAfter,
        selectedTemplate,
        globalPrompt,
        negativePrompt,
        setGlobalPrompt,
        setNegativePrompt,
        aspectRatio,
        isGeneratingSlide,
        setIsGeneratingSlide,
        clearChat,
    } = usePresentationStore();
    const { addCost } = useCostStore();
    const { showToast } = useToast();

    const [isMaskEnabled, setIsMaskEnabled] = useState(false);
    const [inpaintPrompt, setInpaintPrompt] = useState('');
    const [isInpainting, setIsInpainting] = useState(false);
    const [variationCount, setVariationCount] = useState<1 | 2 | 3 | 4>(1);
    const [pendingMask, setPendingMask] = useState<BoundingBox | null>(null);

    const handleMaskComplete = useCallback((box: BoundingBox) => {
        setPendingMask(box);
    }, []);

    const slide = slides[activeSlideIndex];
    if (!slide) return null;

    const handleGenerateSlide = async () => {
        if (!selectedTemplate) return;
        setIsGeneratingSlide(true);
        clearChat();

        try {
            const imageRequests = Array.from({ length: variationCount }, (_, index) =>
                fetch('/api/generate-slide', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        templateBase64: selectedTemplate.base64,
                        templateId: selectedTemplate.id,
                        slidePrompt: `${globalPrompt}. ${slide.local_prompt}`,
                        aspectRatio,
                        negativePrompt,
                        variationIndex: index + 1,
                        totalVariations: variationCount,
                    }),
                })
            );

            // Fire image variations and notes in parallel
            const [imageResults, notesRes] = await Promise.all([
                Promise.allSettled(imageRequests),
                slide.local_prompt
                    ? fetch('/api/generate-notes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ slideConceptPrompt: slide.local_prompt }),
                    })
                    : Promise.resolve(null),
            ]);

            const imagePayloads: string[] = [];
            let firstImageError = '';

            for (const result of imageResults) {
                if (result.status !== 'fulfilled') {
                    firstImageError = firstImageError || 'Image generation failed';
                    continue;
                }

                const imageRes = result.value;
                const data = await imageRes.json();
                if (!imageRes.ok) {
                    if ((imageRes.status === 400 || imageRes.status === 403) && !imagePayloads.length) {
                        showToast('warning', 'Safety Policy', data.error || 'Cannot generate this slide with the current prompt.');
                        return;
                    }
                    firstImageError = firstImageError || data.error || 'Image generation failed';
                    continue;
                }
                if (data.imageBase64) {
                    imagePayloads.push(`data:image/png;base64,${data.imageBase64}`);
                }
            }

            if (imagePayloads.length === 0) {
                throw new Error(firstImageError || 'Image generation failed');
            }

            const updates: Partial<Slide> = {
                image_url: imagePayloads[0],
            };
            addCost('nano_banana_image', imagePayloads.length);

            if (notesRes && notesRes.ok) {
                const notesData = await notesRes.json();
                updates.speaker_notes = notesData.notes;
                if (notesData.tokensUsed) {
                    addCost('gemini_text', notesData.tokensUsed);
                }
            }

            updateSlide(activeSlideIndex, updates);
            if (imagePayloads.length > 1) {
                const insertedSlides: Slide[] = imagePayloads.slice(1).map((imageUrl, index) => ({
                    ...slide,
                    slide_id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 9)}`,
                    slide_index: activeSlideIndex + 1 + index,
                    bullets: [...slide.bullets],
                    image_url: imageUrl,
                    speaker_notes: typeof updates.speaker_notes === 'string' ? updates.speaker_notes : slide.speaker_notes,
                }));
                insertSlidesAfter(activeSlideIndex, insertedSlides);
            }

            const successMessage = imagePayloads.length === variationCount
                ? `Created ${imagePayloads.length} variation${imagePayloads.length === 1 ? '' : 's'} for this slide.`
                : `Created ${imagePayloads.length} of ${variationCount} requested variations for this slide.`;
            showToast('success', 'Slide Generated', successMessage);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'An error occurred';
            showToast('error', 'Generation Failed', msg);
        } finally {
            setIsGeneratingSlide(false);
        }
    };

    const handleInpaint = async () => {
        if (!pendingMask || !inpaintPrompt.trim() || !slide.image_url) return;
        setIsInpainting(true);

        try {
            const res = await fetch('/api/inpaint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: slide.image_url.replace(/^data:image\/\w+;base64,/, ''),
                    maskBounds: pendingMask,
                    prompt: inpaintPrompt,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                if (res.status === 400 || res.status === 403) {
                    showToast('warning', 'Safety Policy', data.error || 'Cannot process this request.');
                    return;
                }
                throw new Error(data.error || 'Inpainting failed');
            }

            const data = await res.json();
            updateSlide(activeSlideIndex, {
                image_url: `data:image/png;base64,${data.imageBase64}`,
            });
            addCost('nano_banana_image', 1);
            setPendingMask(null);
            setInpaintPrompt('');
            setIsMaskEnabled(false);
            showToast('success', 'Inpaint Complete', 'The selected region has been updated.');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'An error occurred';
            showToast('error', 'Inpaint Error', msg);
        } finally {
            setIsInpainting(false);
        }
    };

    return (
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
            {/* ─── Input Section ─── */}
            <div className="glass-panel" style={{ padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                    {/* Shared Global Prompt Controls */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label className="label" htmlFor="global-prompt-inline">
                                <Wand2 size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                Global Prompt
                            </label>
                            <textarea
                                id="global-prompt-inline"
                                className="textarea-field"
                                value={globalPrompt}
                                onChange={(e) => setGlobalPrompt(e.target.value)}
                                placeholder="Applies to every slide generation in this deck"
                                style={{ minHeight: 74 }}
                            />
                        </div>
                        <div>
                            <label className="label" htmlFor="negative-prompt-inline">
                                <ShieldAlert size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                Negative Prompt
                            </label>
                            <textarea
                                id="negative-prompt-inline"
                                className="textarea-field"
                                value={negativePrompt}
                                onChange={(e) => setNegativePrompt(e.target.value)}
                                placeholder="Things to avoid across all slides (optional)"
                                style={{ minHeight: 74 }}
                            />
                        </div>
                    </div>

                    {/* Concept Prompt */}
                    <div>
                        <label className="label" htmlFor="slide-prompt">
                            <MessageSquare size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                            Slide Concept Prompt
                            <PromptStrengthener
                                value={slide.local_prompt}
                                onResult={(v) => updateSlide(activeSlideIndex, { local_prompt: v })}
                                context="slide concept prompt for a presentation slide image"
                            />
                        </label>
                        <textarea
                            id="slide-prompt"
                            className="textarea-field"
                            value={slide.local_prompt}
                            onChange={(e) => updateSlide(activeSlideIndex, { local_prompt: e.target.value })}
                            placeholder="Describe the slide. Include any title or wording you want rendered into the image, e.g.: Title slide for Project Optimus — heading 'Project Optimus' centered, subtitle 'Year 1 Execution Plan' below, with an isometric edge-compute illustration."
                            style={{ minHeight: 100 }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'end' }}>
                        <div>
                            <label className="label" htmlFor="slide-variations">
                                Variations
                            </label>
                            <select
                                id="slide-variations"
                                className="input-field"
                                value={variationCount}
                                onChange={(e) => setVariationCount(Number(e.target.value) as 1 | 2 | 3 | 4)}
                                style={{ maxWidth: 180 }}
                            >
                                <option value={1}>1 variation</option>
                                <option value={2}>2 variations</option>
                                <option value={3}>3 variations</option>
                                <option value={4}>4 variations</option>
                            </select>
                        </div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 12, paddingBottom: 10 }}>
                            Use the Inpaint tool below the preview to fix or change wording after generation.
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        className="btn-primary"
                        onClick={handleGenerateSlide}
                        disabled={isGeneratingSlide}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: 14,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                        }}
                    >
                        {isGeneratingSlide ? (
                            <>
                                <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                                Generating {variationCount} Variation{variationCount === 1 ? '' : 's'}...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                Generate Slide
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ─── Preview Section ─── */}
            <div style={{ position: 'relative' }}>
                {slide.image_url ? (
                    <CanvasOverlay
                        imageUrl={slide.image_url}
                        onMaskComplete={handleMaskComplete}
                        enabled={isMaskEnabled}
                        onToggle={() => {
                            setIsMaskEnabled(!isMaskEnabled);
                            setPendingMask(null);
                        }}
                    />
                ) : (
                    <div
                        className="glass-panel"
                        style={{
                            aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '4:3' ? '4/3' : '9/16',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            maxWidth: aspectRatio === '9:16' ? 320 : undefined,
                            margin: '0 auto',
                        }}
                    >
                        <ImageIcon size={40} style={{ color: 'var(--color-text-muted)' }} />
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
                            Enter a prompt and click Generate Slide
                        </p>
                    </div>
                )}

                {/* Inpaint Prompt (appears when mask is drawn) */}
                {pendingMask && (
                    <div
                        className="glass-panel"
                        style={{
                            display: 'flex',
                            gap: 8,
                            padding: 12,
                            marginTop: 10,
                            animation: 'slide-up 0.2s ease-out',
                        }}
                    >
                        <input
                            className="input-field"
                            value={inpaintPrompt}
                            onChange={(e) => setInpaintPrompt(e.target.value)}
                            placeholder="Describe what should appear in the selected region..."
                            onKeyDown={(e) => e.key === 'Enter' && handleInpaint()}
                            style={{ fontSize: 13 }}
                        />
                        <button
                            className="btn-primary"
                            onClick={handleInpaint}
                            disabled={!inpaintPrompt.trim() || isInpainting}
                            style={{ padding: '8px 16px', fontSize: 13, flexShrink: 0 }}
                        >
                            {isInpainting ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Inpaint'}
                        </button>
                    </div>
                )}
            </div>

            {/* ─── Speaker Notes ─── */}
            {slide.speaker_notes && (
                <div
                    className="glass-panel"
                    style={{ padding: 16, marginTop: 16, animation: 'fade-in 0.4s ease-out' }}
                >
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                        Speaker Notes
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {slide.speaker_notes}
                    </div>
                </div>
            )}

            {/* ─── Conversational Refinement Chat ─── */}
            <RefinementChat />
        </div>
    );
}
