'use client';

import { useRef, useState, useCallback } from 'react';
import type { BoundingBox } from '@/lib/types';
import { Scissors, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';

interface Props {
    imageUrl: string;
    onMaskComplete: (box: BoundingBox) => void;
    enabled: boolean;
    onToggle: () => void;
}

export default function CanvasOverlay({ imageUrl, onMaskComplete, enabled, onToggle }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);
    const [finalBox, setFinalBox] = useState<BoundingBox | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const getRelativePos = useCallback((e: React.MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
        };
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!enabled) return;
        const pos = getRelativePos(e);
        setStartPos(pos);
        setIsDrawing(true);
        setCurrentBox(null);
        setFinalBox(null);
    }, [enabled, getRelativePos]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDrawing) return;
        const pos = getRelativePos(e);
        setCurrentBox({
            x: Math.min(startPos.x, pos.x),
            y: Math.min(startPos.y, pos.y),
            width: Math.abs(pos.x - startPos.x),
            height: Math.abs(pos.y - startPos.y),
        });
    }, [isDrawing, startPos, getRelativePos]);

    const handleMouseUp = useCallback(() => {
        if (!isDrawing || !currentBox) return;
        setIsDrawing(false);
        if (currentBox.width > 2 && currentBox.height > 2) {
            setFinalBox(currentBox);
        }
    }, [isDrawing, currentBox]);

    const handleApply = () => {
        if (finalBox) {
            onMaskComplete(finalBox);
            setFinalBox(null);
            setCurrentBox(null);
        }
    };

    const handleClear = () => {
        setFinalBox(null);
        setCurrentBox(null);
    };

    const handleImageClick = () => {
        // Only toggle expand when NOT in inpaint/masking mode
        if (!enabled) {
            setIsExpanded(!isExpanded);
        }
    };

    const box = finalBox || currentBox;

    return (
        <>
            {/* ── Expanded Lightbox Overlay ── */}
            {isExpanded && (
                <div
                    onClick={() => setIsExpanded(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1000,
                        background: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'zoom-out',
                        animation: 'fade-in 0.2s ease-out',
                        padding: 40,
                    }}
                >
                    {/* Close hint */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 20,
                            right: 24,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: 13,
                        }}
                    >
                        <Minimize2 size={14} />
                        Click anywhere to close
                    </div>

                    {/* Expanded Image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imageUrl}
                        alt="Slide preview expanded"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(false);
                        }}
                        style={{
                            maxWidth: '92vw',
                            maxHeight: '88vh',
                            objectFit: 'contain',
                            borderRadius: 12,
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.08)',
                        }}
                        draggable={false}
                    />
                </div>
            )}

            {/* ── Normal Inline View ── */}
            <div style={{ position: 'relative' }}>
                {/* Toggle Buttons */}
                <div style={{ position: 'absolute', top: -44, right: 0, zIndex: 10, display: 'flex', gap: 6 }}>
                    <button
                        onClick={onToggle}
                        className={enabled ? 'btn-primary' : 'btn-secondary'}
                        style={{
                            padding: '6px 12px',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <Scissors size={14} />
                        {enabled ? 'Masking On' : 'Inpaint'}
                    </button>
                </div>

                {/* Image + Overlay Container */}
                <div
                    ref={containerRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => isDrawing && setIsDrawing(false)}
                    onClick={handleImageClick}
                    style={{
                        position: 'relative',
                        width: '100%',
                        borderRadius: 10,
                        overflow: 'hidden',
                        cursor: enabled ? 'crosshair' : 'zoom-in',
                        userSelect: 'none',
                        transition: 'box-shadow 0.2s ease',
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imageUrl}
                        alt="Slide preview"
                        style={{
                            width: '100%',
                            display: 'block',
                        }}
                        draggable={false}
                    />

                    {/* Expand hint (shown only when not in inpaint mode) */}
                    {!enabled && (
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 8,
                                left: 8,
                                background: 'rgba(0,0,0,0.6)',
                                borderRadius: 6,
                                padding: '4px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                color: 'rgba(255,255,255,0.6)',
                                opacity: 0.7,
                                transition: 'opacity 0.2s ease',
                                pointerEvents: 'none',
                            }}
                        >
                            <Maximize2 size={10} />
                            Click to expand
                        </div>
                    )}

                    {/* Selection Box */}
                    {enabled && box && (
                        <>
                            {/* Dimming overlay outside selection */}
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.5)',
                                    clipPath: `polygon(
                  0% 0%, 100% 0%, 100% 100%, 0% 100%,
                  0% ${box.y}%,
                  ${box.x}% ${box.y}%,
                  ${box.x}% ${box.y + box.height}%,
                  ${box.x + box.width}% ${box.y + box.height}%,
                  ${box.x + box.width}% ${box.y}%,
                  0% ${box.y}%
                )`,
                                    pointerEvents: 'none',
                                }}
                            />
                            {/* Selection border */}
                            <div
                                style={{
                                    position: 'absolute',
                                    left: `${box.x}%`,
                                    top: `${box.y}%`,
                                    width: `${box.width}%`,
                                    height: `${box.height}%`,
                                    border: '2px dashed var(--color-accent-cyan)',
                                    borderRadius: 4,
                                    pointerEvents: 'none',
                                    boxShadow: '0 0 10px rgba(0,212,255,0.3)',
                                }}
                            />
                        </>
                    )}
                </div>

                {/* Action bar for completed selection */}
                {enabled && finalBox && (
                    <div
                        style={{
                            display: 'flex',
                            gap: 8,
                            marginTop: 10,
                            justifyContent: 'flex-end',
                            animation: 'slide-up 0.2s ease-out',
                        }}
                    >
                        <button onClick={handleClear} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <RotateCcw size={12} /> Clear
                        </button>
                        <button onClick={handleApply} className="btn-primary" style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Scissors size={12} /> Apply Mask
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
