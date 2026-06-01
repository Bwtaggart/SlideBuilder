'use client';

import { useState, useRef, useCallback } from 'react';
import { Plus, Trash2, GripVertical, Image as ImageIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { usePresentationStore } from '@/store/presentationStore';
import SlideInspector from './SlideInspector';
import ExportBar from './ExportBar';

/** Where the active selection should land after a slide moves from `from` to `to`. */
function activeIndexAfterMove(active: number, from: number, to: number): number {
    if (active === from) return to;
    if (from < active && to >= active) return active - 1;
    if (from > active && to <= active) return active + 1;
    return active;
}

export default function SlideBuilder() {
    const {
        slides,
        activeSlideIndex,
        setActiveSlideIndex,
        addSlide,
        deleteSlide,
        reorderSlides,
    } = usePresentationStore();

    // ── Pointer-based drag-and-drop state ──
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    const commitMove = useCallback((from: number, to: number) => {
        if (from === to) return;
        reorderSlides(from, to);
        setActiveSlideIndex(activeIndexAfterMove(activeSlideIndex, from, to));
    }, [reorderSlides, setActiveSlideIndex, activeSlideIndex]);

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, index: number) => {
        if (e.button !== 0) return;
        setDragIndex(index);
        setDropIndex(index);
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            // ignore — capture is best-effort
        }
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (dragIndex === null) return;
        const y = e.clientY;
        // Find the slide whose vertical midpoint the pointer is closest above.
        let target = slides.length - 1;
        for (let i = 0; i < slides.length; i++) {
            const el = itemRefs.current[i];
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            if (y < rect.top + rect.height / 2) {
                target = i;
                break;
            }
        }
        setDropIndex(target);
    }, [dragIndex, slides.length]);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (dragIndex !== null && dropIndex !== null) {
            commitMove(dragIndex, dropIndex);
        }
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            // ignore
        }
        setDragIndex(null);
        setDropIndex(null);
    }, [dragIndex, dropIndex, commitMove]);

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 60px)', animation: 'fade-in 0.4s ease-out' }}>
            {/* ─── Left Sidebar: Slide Thumbnails ─── */}
            <div
                className="glass-panel"
                style={{
                    width: 200,
                    borderRadius: 0,
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderBottom: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                    flexShrink: 0,
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '14px 14px 10px',
                        borderBottom: '1px solid var(--color-border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-secondary)' }}>
                        Slides
                    </span>
                    <button
                        onClick={addSlide}
                        style={{
                            background: 'none',
                            border: '1px solid var(--color-border-default)',
                            borderRadius: 6,
                            padding: '4px 6px',
                            cursor: 'pointer',
                            color: 'var(--color-text-muted)',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                        }}
                        title="Add slide"
                    >
                        <Plus size={12} />
                    </button>
                </div>

                {/* Thumbnails */}
                <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {slides.map((slide, index) => {
                        const isActive = index === activeSlideIndex;
                        const isDragging = index === dragIndex;
                        const isDropTarget = index === dropIndex && dragIndex !== null && dropIndex !== dragIndex;
                        const qaFlagged = slide.qa_passed === false && (slide.qa_issues?.length ?? 0) > 0;

                        return (
                            <div
                                key={slide.slide_id}
                                ref={(el) => { itemRefs.current[index] = el; }}
                                style={{ position: 'relative' }}
                            >
                                {/* Insertion indicator line above the drop target */}
                                {isDropTarget && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: -4,
                                            left: 0,
                                            right: 0,
                                            height: 3,
                                            borderRadius: 2,
                                            background: 'var(--color-accent-purple)',
                                            boxShadow: '0 0 8px rgba(168,85,247,0.6)',
                                            zIndex: 2,
                                        }}
                                    />
                                )}
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onPointerDown={(e) => handlePointerDown(e, index)}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onClick={() => setActiveSlideIndex(index)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveSlideIndex(index); }}
                                    style={{
                                        position: 'relative',
                                        aspectRatio: '16/10',
                                        borderRadius: 8,
                                        overflow: 'hidden',
                                        border: isActive
                                            ? '2px solid var(--color-accent-cyan)'
                                            : '1px solid var(--color-border-default)',
                                        background: 'var(--color-bg-card)',
                                        cursor: 'grab',
                                        transition: 'opacity 0.15s ease, box-shadow 0.15s ease',
                                        touchAction: 'none',
                                        opacity: isDragging ? 0.4 : 1,
                                        boxShadow: isActive ? '0 0 12px rgba(0,212,255,0.15)' : 'none',
                                    }}
                                >
                                    {slide.image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={slide.image_url}
                                            alt={`Slide ${index + 1}`}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                                            draggable={false}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 4,
                                            }}
                                        >
                                            <ImageIcon size={16} style={{ color: 'var(--color-text-muted)' }} />
                                            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Empty</span>
                                        </div>
                                    )}

                                    {/* Slide number badge */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: 4,
                                            left: 4,
                                            width: 18,
                                            height: 18,
                                            borderRadius: 4,
                                            background: isActive ? 'var(--color-accent-cyan)' : 'rgba(0,0,0,0.6)',
                                            color: isActive ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)',
                                            fontSize: 10,
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontFamily: 'var(--font-mono)',
                                        }}
                                    >
                                        {index + 1}
                                    </div>

                                    {/* QA flag dot */}
                                    {qaFlagged && (
                                        <div
                                            title="QA flagged issues on this slide"
                                            style={{
                                                position: 'absolute',
                                                top: 4,
                                                left: 26,
                                                width: 10,
                                                height: 10,
                                                borderRadius: '50%',
                                                background: '#f59e0b',
                                                boxShadow: '0 0 6px rgba(245,158,11,0.7)',
                                            }}
                                        />
                                    )}

                                    {/* Drag grip icon */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            bottom: 4,
                                            right: 4,
                                            width: 18,
                                            height: 18,
                                            borderRadius: 4,
                                            background: 'rgba(0,0,0,0.5)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'rgba(255,255,255,0.6)',
                                        }}
                                        title="Drag to reorder"
                                    >
                                        <GripVertical size={11} />
                                    </div>

                                    {/* Reorder + delete controls (active slide only) */}
                                    {isActive && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: 4,
                                                right: 4,
                                                display: 'flex',
                                                gap: 3,
                                            }}
                                        >
                                            <button
                                                onPointerDown={(e) => e.stopPropagation()}
                                                onClick={(e) => { e.stopPropagation(); commitMove(index, index - 1); }}
                                                disabled={index === 0}
                                                style={{
                                                    width: 18,
                                                    height: 18,
                                                    borderRadius: 4,
                                                    background: 'rgba(0,0,0,0.6)',
                                                    border: 'none',
                                                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    opacity: index === 0 ? 0.3 : 1,
                                                    padding: 0,
                                                }}
                                                title="Move up"
                                            >
                                                <ChevronUp size={11} />
                                            </button>
                                            <button
                                                onPointerDown={(e) => e.stopPropagation()}
                                                onClick={(e) => { e.stopPropagation(); commitMove(index, index + 1); }}
                                                disabled={index === slides.length - 1}
                                                style={{
                                                    width: 18,
                                                    height: 18,
                                                    borderRadius: 4,
                                                    background: 'rgba(0,0,0,0.6)',
                                                    border: 'none',
                                                    cursor: index === slides.length - 1 ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    opacity: index === slides.length - 1 ? 0.3 : 1,
                                                    padding: 0,
                                                }}
                                                title="Move down"
                                            >
                                                <ChevronDown size={11} />
                                            </button>
                                            {slides.length > 1 && (
                                                <button
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => { e.stopPropagation(); deleteSlide(index); }}
                                                    style={{
                                                        width: 18,
                                                        height: 18,
                                                        borderRadius: 4,
                                                        background: 'rgba(239,68,68,0.85)',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#fff',
                                                        padding: 0,
                                                    }}
                                                    title="Delete slide"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── Right Pane: Inspector ─── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                <SlideInspector />
                <ExportBar />
            </div>
        </div>
    );
}
