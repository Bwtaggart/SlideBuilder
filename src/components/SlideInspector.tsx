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
        matchFirstSlideStyle,
        autoQaCheck,
        setMatchFirstSlideStyle,
        setAutoQaCheck,
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

    // Non-blocking second-pass QA: inspect a rendered slide image for spelling,
    // legibility, and instruction-adherence issues and flag (never auto-fix) them.
    const runQaCheck = useCallback(
        async (slideIndex: number, imageDataUrl: string, prompt: string) => {
            try {
                const res = await fetch('/api/qa-check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageBase64: imageDataUrl.replace(/^data:image\/\w+;base64,/, ''),
                        slidePrompt: prompt,
                    }),
                });
                if (!res.ok) return;
                const data = await res.json();
                const issues: string[] = [
                    ...(data.spellingIssues || []),
                    ...(data.legibilityIssues || []),
                    ...(data.instructionIssues || []),
                ];
                updateSlide(slideIndex, {
                    qa_passed: Boolean(data.passedQA),
                    qa_issues: issues,
                });
                if (data.tokensUsed) {
                    addCost('gemini_text', data.tokensUsed);
                }
            } catch {
                // QA is best-effort; ignore failures.
            }
        },
        [updateSlide, addCost],
    );

    const slide = slides[activeSlideIndex];
    if (!slide) return null;

    const handleGenerateSlide = async () => {
        if (!selectedTemplate) return;
        setIsGeneratingSlide(true);
        clearChat();

        // Carry the first slide's rendered look forward to every later slide.
        const firstSlideImage = slides[0]?.image_url;
        const styleReferenceBase64 =
            matchFirstSlideStyle && activeSlideIndex > 0 && firstSlideImage
                ? firstSlideImage.replace(/^data:image\/\w+;base64,/, '')
                : undefined;
        const combinedPrompt = `${globalPrompt}. ${slide.local_prompt}`;

        try {
            const imageRequests = Array.from({ length: variationCount }, (_, index) =>
                fetch('/api/generate-slide', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        templateBase64: selectedTemplate.base64,
                        templateId: selectedTemplate.id,
                        slidePrompt: combinedPrompt,
                        aspectRatio,
                        negativePrompt,
                        variationIndex: index + 1,
                        totalVariations: variationCount,
                        styleReferenceBase64,
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
                // Clear any stale QA result from a previous render of this slide.
                qa_passed: undefined,
                qa_issues: undefined,
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

            // Fire the second-pass QA check for each generated image (non-blocking).
            if (autoQaCheck) {
                imagePayloads.forEach((imageUrl, i) => {
                    void runQaCheck(activeSlideIndex + i, imageUrl, combinedPrompt);
                });
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4 }}>
                            {activeSlideIndex === 0 ? (
                                <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                                    This is slide 1 — its rendered style becomes the reference for the rest of the deck.
                                </span>
                            ) : (
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={matchFirstSlideStyle}
                                        onChange={(e) => setMatchFirstSlideStyle(e.target.checked)}
                                    />
                                    Match first slide&rsquo;s style
                                </label>
                            )}
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={autoQaCheck}
                                    onChange={(e) => setAutoQaCheck(e.target.checked)}
                                />
                                Auto QA check (spelling &amp; legibility)
                            </label>
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

            {/* ─── QA Warning Badge ─── */}
            {slide.image_url && slide.qa_passed === false && (slide.qa_issues?.length ?? 0) > 0 && (
                <div
                    style={{
                        display: 'flex',
                        gap: 10,
                        padding: 14,
                        marginTop: 16,
                        borderRadius: 8,
                        border: '1px solid rgba(245,158,11,0.4)',
                        background: 'rgba(245,158,11,0.08)',
                        animation: 'fade-in 0.4s ease-out',
                    }}
                >
                    <ShieldAlert size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', marginBottom: 6 }}>
                            QA flagged {slide.qa_issues!.length} issue{slide.qa_issues!.length === 1 ? '' : 's'} — review before exporting
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
                            {slide.qa_issues!.map((issue, i) => (
                                <li key={i}>{issue}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

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
