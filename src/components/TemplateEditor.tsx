'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Trash2, X, Check, Move, Loader2, Eraser } from 'lucide-react';
import type { GraphicOverlay } from '@/lib/types';
import { removeBackground } from '@/lib/removeBackground';

interface Graphic {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}

interface TemplateEditorProps {
  templateBase64: string;
  onSave: (compositeBase64: string, overlays: GraphicOverlay[]) => void;
  onCancel: () => void;
}

export default function TemplateEditor({ templateBase64, onSave, onCancel }: TemplateEditorProps) {
  const [graphics, setGraphics] = useState<Graphic[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    id: string;
    type: 'move' | 'resize';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateImgRef = useRef<HTMLImageElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [templateAspect, setTemplateAspect] = useState<string>('16/10');
  const [removeBg, setRemoveBg] = useState(true);
  const [processingBg, setProcessingBg] = useState<string | null>(null); // graphic id being processed

  useEffect(() => {
    // Detect the template image's natural aspect ratio so the editor
    // container matches exactly — no cover-cropping, no position drift.
    const img = new Image();
    img.onload = () => {
      setTemplateAspect(`${img.naturalWidth}/${img.naturalHeight}`);
    };
    const src = templateBase64.startsWith('data:')
      ? templateBase64
      : `data:image/png;base64,${templateBase64}`;
    img.src = src;
  }, [templateBase64]);

  useEffect(() => {
    if (!canvasAreaRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    obs.observe(canvasAreaRef.current);
    return () => obs.disconnect();
  }, []);

  const addGraphicFromDataUrl = useCallback((dataUrl: string, gId?: string) => {
    const img = new Image();
    img.onload = () => {
      const maxW = canvasSize.width * 0.4;
      const scale = img.width > maxW ? maxW / img.width : 1;
      const id = gId || `g-${Date.now()}`;
      const g: Graphic = {
        id,
        src: dataUrl,
        x: canvasSize.width * 0.1,
        y: canvasSize.height * 0.1,
        width: img.width * scale,
        height: img.height * scale,
        naturalWidth: img.width,
        naturalHeight: img.height,
      };
      setGraphics((prev) => {
        // If updating an existing graphic (after bg removal), replace it
        const existing = prev.findIndex((p) => p.id === id);
        if (existing !== -1) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], src: dataUrl };
          return updated;
        }
        return [...prev, g];
      });
      setSelectedId(id);
    };
    img.src = dataUrl;
  }, [canvasSize]);

  const handleAddGraphic = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const gId = `g-${Date.now()}`;

      // Add the graphic immediately (original or transparent)
      addGraphicFromDataUrl(dataUrl, gId);

      // If Remove BG is enabled, process in the background and swap the src
      if (removeBg) {
        setProcessingBg(gId);
        try {
          const transparentUrl = await removeBackground(dataUrl);
          // Replace the graphic's src with the transparent version
          setGraphics((prev) =>
            prev.map((g) => (g.id === gId ? { ...g, src: transparentUrl } : g)),
          );
        } catch (err) {
          console.error('Background removal failed:', err);
          // Keep the original image — no-op
        } finally {
          setProcessingBg(null);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBgForSelected = useCallback(async () => {
    if (!selectedId) return;
    const g = graphics.find((gr) => gr.id === selectedId);
    if (!g) return;
    setProcessingBg(selectedId);
    try {
      const transparentUrl = await removeBackground(g.src);
      setGraphics((prev) =>
        prev.map((gr) => (gr.id === selectedId ? { ...gr, src: transparentUrl } : gr)),
      );
    } catch (err) {
      console.error('Background removal failed:', err);
    } finally {
      setProcessingBg(null);
    }
  }, [selectedId, graphics]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, id: string, type: 'move' | 'resize') => {
      e.stopPropagation();
      e.preventDefault();
      const g = graphics.find((gr) => gr.id === id);
      if (!g) return;
      setSelectedId(id);
      setDragState({
        id,
        type,
        startX: e.clientX,
        startY: e.clientY,
        origX: g.x,
        origY: g.y,
        origW: g.width,
        origH: g.height,
      });
    },
    [graphics],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      setGraphics((prev) =>
        prev.map((g) => {
          if (g.id !== dragState.id) return g;
          if (dragState.type === 'move') {
            return { ...g, x: dragState.origX + dx, y: dragState.origY + dy };
          }
          const newW = Math.max(30, dragState.origW + dx);
          const aspect = g.naturalWidth / g.naturalHeight;
          return { ...g, width: newW, height: newW / aspect };
        }),
      );
    },
    [dragState],
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  const handleDelete = (id: string) => {
    setGraphics((prev) => prev.filter((g) => g.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleSave = useCallback(() => {
    const canvas = document.createElement('canvas');
    const img = templateImgRef.current;
    if (!img) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const areaW = canvasSize.width;
    const areaH = canvasSize.height;
    const scaleX = img.naturalWidth / areaW;
    const scaleY = img.naturalHeight / areaH;

    // Build percentage-based overlays for post-generation compositing
    const overlays: GraphicOverlay[] = graphics.map((g) => ({
      src: g.src,
      xPct: g.x / areaW,
      yPct: g.y / areaH,
      widthPct: g.width / areaW,
      heightPct: g.height / areaH,
    }));

    let remaining = graphics.length;
    if (remaining === 0) {
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      onSave(base64, []);
      return;
    }

    graphics.forEach((g) => {
      const gImg = new Image();
      gImg.onload = () => {
        ctx.drawImage(gImg, g.x * scaleX, g.y * scaleY, g.width * scaleX, g.height * scaleY);
        remaining--;
        if (remaining === 0) {
          const base64 = canvas.toDataURL('image/png').split(',')[1];
          onSave(base64, overlays);
        }
      };
      gImg.src = g.src;
    });
  }, [graphics, canvasSize, onSave]);

  const templateSrc = templateBase64.startsWith('data:')
    ? templateBase64
    : `data:image/png;base64,${templateBase64}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={() => setSelectedId(null)}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAddGraphic}
      />

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 12,
          padding: '10px 16px',
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="atl-btn atl-btn-pri"
          onClick={() => fileInputRef.current?.click()}
          disabled={!!processingBg}
        >
          <Plus size={13} /> Add graphic
        </button>
        <button
          className="atl-btn"
          title={removeBg ? 'Auto-remove background is ON' : 'Auto-remove background is OFF'}
          onClick={() => setRemoveBg(!removeBg)}
          style={{
            background: removeBg ? 'var(--color-accent)' : undefined,
            color: removeBg ? '#fff' : undefined,
            borderColor: removeBg ? 'var(--color-accent)' : undefined,
          }}
        >
          <Eraser size={13} /> Remove BG {removeBg ? 'ON' : 'OFF'}
        </button>
        {selectedId && (
          <>
            <button
              className="atl-btn"
              title="Remove background from selected graphic"
              onClick={handleRemoveBgForSelected}
              disabled={!!processingBg}
            >
              {processingBg === selectedId ? (
                <Loader2 size={13} style={{ animation: 'atl-spin 0.8s linear infinite' }} />
              ) : (
                <Eraser size={13} />
              )}{' '}
              Remove BG
            </button>
            <button
              className="atl-btn"
              style={{ color: '#b91c1c' }}
              onClick={() => handleDelete(selectedId)}
            >
              <Trash2 size={13} /> Remove
            </button>
          </>
        )}
        <div style={{ width: 1, background: 'var(--color-border-default)', margin: '0 4px' }} />
        <button className="atl-btn atl-btn-pri" onClick={handleSave}>
          <Check size={13} /> Done
        </button>
        <button className="atl-btn" onClick={onCancel}>
          <X size={13} /> Cancel
        </button>
      </div>

      {/* Canvas area */}
      <div
        ref={canvasAreaRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}
        style={{
          position: 'relative',
          width: '80vw',
          maxWidth: 960,
          aspectRatio: templateAspect,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          cursor: dragState?.type === 'move' ? 'grabbing' : 'default',
          userSelect: 'none',
        }}
      >
        <img
          ref={templateImgRef}
          src={templateSrc}
          alt="Template"
          style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
          draggable={false}
        />

        {graphics.map((g) => {
          const isSel = g.id === selectedId;
          return (
            <div
              key={g.id}
              onMouseDown={(e) => handleMouseDown(e, g.id, 'move')}
              onClick={(e) => { e.stopPropagation(); setSelectedId(g.id); }}
              style={{
                position: 'absolute',
                left: g.x,
                top: g.y,
                width: g.width,
                height: g.height,
                cursor: dragState?.id === g.id ? 'grabbing' : 'grab',
                outline: isSel ? '2px solid var(--color-accent)' : '1px solid transparent',
                outlineOffset: 2,
                borderRadius: 2,
              }}
            >
              <img
                src={g.src}
                alt=""
                draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
              />
              {processingBg === g.id && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 2,
                  }}
                >
                  <div style={{ color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Loader2 size={14} style={{ animation: 'atl-spin 0.8s linear infinite' }} />
                    Removing BG…
                  </div>
                </div>
              )}
              {isSel && (
                <>
                  {/* Move handle */}
                  <div
                    style={{
                      position: 'absolute',
                      top: -28,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--color-accent)',
                      color: '#fff',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Move size={9} /> drag to move
                  </div>
                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, g.id, 'resize')}
                    style={{
                      position: 'absolute',
                      right: -5,
                      bottom: -5,
                      width: 12,
                      height: 12,
                      background: 'var(--color-accent)',
                      border: '2px solid #fff',
                      borderRadius: 2,
                      cursor: 'nwse-resize',
                    }}
                  />
                  {/* Corner indicators */}
                  {[
                    { top: -3, left: -3 },
                    { top: -3, right: -3 },
                    { bottom: -3, left: -3 },
                  ].map((pos, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        ...pos,
                        width: 6,
                        height: 6,
                        background: '#fff',
                        border: '1.5px solid var(--color-accent)',
                        borderRadius: 1,
                        pointerEvents: 'none',
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          );
        })}

        {graphics.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              Click &quot;Add graphic&quot; to overlay images on this template
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
