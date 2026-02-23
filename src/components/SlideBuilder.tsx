'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, Image as ImageIcon } from 'lucide-react';
import { usePresentationStore } from '@/store/presentationStore';
import SlideInspector from './SlideInspector';
import ExportBar from './ExportBar';

export default function SlideBuilder() {
    const {
        slides,
        activeSlideIndex,
        setActiveSlideIndex,
        addSlide,
        deleteSlide,
    } = usePresentationStore();

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
                        return (
                            <div
                                key={slide.slide_id}
                                role="button"
                                tabIndex={0}
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
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    padding: 0,
                                    boxShadow: isActive ? '0 0 12px rgba(0,212,255,0.15)' : 'none',
                                }}
                            >
                                {slide.image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={slide.image_url}
                                        alt={`Slide ${index + 1}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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

                                {/* Delete button (only when more than 1 slide) */}
                                {slides.length > 1 && isActive && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteSlide(index);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: 4,
                                            right: 4,
                                            width: 18,
                                            height: 18,
                                            borderRadius: 4,
                                            background: 'rgba(239,68,68,0.8)',
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
