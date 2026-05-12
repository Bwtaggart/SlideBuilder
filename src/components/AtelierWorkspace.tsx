'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plus,
  Sparkles,
  Pencil,
  Copy,
  Trash2,
  Wand2,
  MessageSquare,
  Layers,
  Download,
  X,
  Send,
  Check,
  Loader2,
} from 'lucide-react';
import AtelierTopbar from './AtelierTopbar';
import PromptStrengthener from './PromptStrengthener';
import { usePresentationStore } from '@/store/presentationStore';
import { useCostStore } from '@/store/costStore';
import { useToast } from './Toast';
import { formatCost } from '@/lib/calculateCost';
import { compositeOverlays } from '@/lib/compositeOverlays';

interface AtelierWorkspaceProps {
  projectName: string;
  onHome: () => void;
  onGallery: () => void;
  onExport: () => void;
}

export default function AtelierWorkspace({
  projectName,
  onHome,
  onGallery,
  onExport,
}: AtelierWorkspaceProps) {
  const {
    slides,
    activeSlideIndex,
    setActiveSlideIndex,
    updateSlide,
    addSlide,
    deleteSlide,
    insertSlidesAfter,
    isGeneratingSlide,
    setIsGeneratingSlide,
    chatMessages,
    globalPrompt,
    negativePrompt,
    aspectRatio,
    selectedTemplate,
  } = usePresentationStore();
  const { sessionCost, addCost } = useCostStore();
  const [drawer, setDrawer] = useState<null | 'discuss' | 'style'>(null);
  const [variationCount, setVariationCount] = useState(1);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  const [isApplyingStyle, setIsApplyingStyle] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { addChatMessage } = usePresentationStore();
  const { showToast } = useToast();

  const [editMode, setEditMode] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [selBox, setSelBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const slide = slides[activeSlideIndex];

  const handleUpdateField = (field: string, value: string | string[]) => {
    if (!slide) return;
    updateSlide(activeSlideIndex, { [field]: value });
  };

  const handleGenerate = useCallback(async () => {
    if (!slide || isGeneratingSlide) return;
    if (!slide.local_prompt) return;
    setIsGeneratingSlide(true);
    try {
      const templateId = selectedTemplate?.id || 'blank-template';
      const templateBase64 = selectedTemplate?.originalBase64 || selectedTemplate?.base64 || '';
      const overlays = selectedTemplate?.overlays || [];
      const res = await fetch('/api/generate-slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          templateBase64,
          slidePrompt: slide.local_prompt,
          title: slide.title,
          subtitle: slide.subtitle,
          bullets: slide.bullets,
          aspectRatio,
          negativePrompt,
          reservedZones: overlays.map((o) => ({ xPct: o.xPct, yPct: o.yPct, widthPct: o.widthPct, heightPct: o.heightPct })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      if (data.imageBase64) {
        const finalBase64 = overlays.length
          ? await compositeOverlays(data.imageBase64, overlays)
          : data.imageBase64;
        updateSlide(activeSlideIndex, {
          image_url: `data:image/png;base64,${finalBase64}`,
        });
        addCost('nano_banana_image', 1);
      }
    } catch (err) {
      console.error('Generate slide error:', err);
    } finally {
      setIsGeneratingSlide(false);
    }
  }, [slide, isGeneratingSlide, selectedTemplate, aspectRatio, negativePrompt, activeSlideIndex, setIsGeneratingSlide, updateSlide, addCost]);

  const getRelativePos = (e: React.MouseEvent) => {
    if (!stageRef.current) return { px: 0, py: 0 };
    const rect = stageRef.current.getBoundingClientRect();
    return {
      px: ((e.clientX - rect.left) / rect.width) * 100,
      py: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleStageMouseDown = (e: React.MouseEvent) => {
    if (!editMode) return;
    const { px, py } = getRelativePos(e);
    setDragStart({ x: px, y: py });
    setSelBox(null);
    setDragging(true);
  };

  const handleStageMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !dragStart) return;
    const { px, py } = getRelativePos(e);
    setSelBox({
      x: Math.min(dragStart.x, px),
      y: Math.min(dragStart.y, py),
      w: Math.abs(px - dragStart.x),
      h: Math.abs(py - dragStart.y),
    });
  };

  const handleStageMouseUp = () => {
    setDragging(false);
    setDragStart(null);
  };

  const handleSlideEdit = useCallback(async () => {
    if (!slide?.image_url || !selBox || !editPrompt.trim() || isEditing) return;
    setIsEditing(true);
    try {
      let base64 = slide.image_url;
      if (base64.startsWith('data:')) {
        base64 = base64.split(',')[1];
      }
      const res = await fetch('/api/inpaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          maskBounds: { x: selBox.x, y: selBox.y, width: selBox.w, height: selBox.h },
          prompt: editPrompt.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Edit failed');
      if (data.imageBase64) {
        updateSlide(activeSlideIndex, {
          image_url: `data:image/png;base64,${data.imageBase64}`,
        });
        addCost('nano_banana_image', 1);
      }
      setEditMode(false);
      setSelBox(null);
      setEditPrompt('');
    } catch (err) {
      console.error('Slide edit error:', err);
    } finally {
      setIsEditing(false);
    }
  }, [slide, selBox, editPrompt, isEditing, activeSlideIndex, updateSlide, addCost]);

  const handleApplyToDeck = useCallback(async () => {
    const slidesWithPrompts = slides.filter((s) => s.local_prompt);
    if (slidesWithPrompts.length === 0 || isApplyingStyle) return;
    setIsApplyingStyle(true);
    try {
      const templateId = selectedTemplate?.id || 'blank-template';
      const templateBase64 = selectedTemplate?.originalBase64 || selectedTemplate?.base64 || '';
      const overlays = selectedTemplate?.overlays || [];
      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        if (!s.local_prompt) continue;
        const res = await fetch('/api/generate-slide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId,
            templateBase64,
            slidePrompt: s.local_prompt,
            title: s.title,
            subtitle: s.subtitle,
            bullets: s.bullets,
            aspectRatio,
            negativePrompt,
            reservedZones: overlays.map((o) => ({ xPct: o.xPct, yPct: o.yPct, widthPct: o.widthPct, heightPct: o.heightPct })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Generation failed');
        if (data.imageBase64) {
          const finalBase64 = overlays.length
            ? await compositeOverlays(data.imageBase64, overlays)
            : data.imageBase64;
          updateSlide(i, { image_url: `data:image/png;base64,${finalBase64}` });
          addCost('nano_banana_image', 1);
        }
      }
    } catch (err) {
      console.error('Apply to deck error:', err);
    } finally {
      setIsApplyingStyle(false);
    }
  }, [slides, isApplyingStyle, selectedTemplate, aspectRatio, negativePrompt, updateSlide, addCost]);

  const handleVariations = useCallback(async () => {
    if (!slide || isGeneratingSlide) return;
    if (!slide.local_prompt) return;
    setIsGeneratingSlide(true);
    try {
      const templateId = selectedTemplate?.id || 'blank-template';
      const templateBase64 = selectedTemplate?.originalBase64 || selectedTemplate?.base64 || '';
      const overlays = selectedTemplate?.overlays || [];
      const results = await Promise.allSettled(
        Array.from({ length: variationCount }, (_, i) =>
          fetch('/api/generate-slide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templateId,
              templateBase64,
              slidePrompt: slide.local_prompt,
              title: slide.title,
              subtitle: slide.subtitle,
              bullets: slide.bullets,
              aspectRatio,
              negativePrompt,
              variationIndex: i + 1,
              totalVariations: variationCount,
              reservedZones: overlays.map((o) => ({ xPct: o.xPct, yPct: o.yPct, widthPct: o.widthPct, heightPct: o.heightPct })),
            }),
          }).then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Generation failed');
            return data;
          })
        )
      );
      const newSlides = [];
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.imageBase64) {
          const finalBase64 = overlays.length
            ? await compositeOverlays(result.value.imageBase64, overlays)
            : result.value.imageBase64;
          newSlides.push({
            ...slide,
            slide_id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            image_url: `data:image/png;base64,${finalBase64}`,
            variationOfId: slide.slide_id,
          });
          addCost('nano_banana_image', 1);
        } else if (result.status === 'rejected') {
          console.error('Variation failed:', result.reason);
        }
      }
      if (newSlides.length > 0) {
        insertSlidesAfter(activeSlideIndex, newSlides);
      }
    } catch (err) {
      console.error('Variations error:', err);
    } finally {
      setIsGeneratingSlide(false);
    }
  }, [slide, isGeneratingSlide, selectedTemplate, aspectRatio, negativePrompt, variationCount, activeSlideIndex, setIsGeneratingSlide, insertSlidesAfter, addCost]);

  // Compute slide labels: main slides get 01, 02, 03; variations get 01a, 01b, 01c
  const slideLabels: string[] = (() => {
    const labels: string[] = [];
    let mainNum = 0;
    const parentLabelMap: Record<string, string> = {};
    const parentVarCount: Record<string, number> = {};
    for (const s of slides) {
      if (!s.variationOfId) {
        mainNum++;
        const label = String(mainNum).padStart(2, '0');
        labels.push(label);
        parentLabelMap[s.slide_id] = label;
      } else {
        const parentLabel = parentLabelMap[s.variationOfId] || '??';
        const count = parentVarCount[s.variationOfId] || 0;
        labels.push(`${parentLabel}${String.fromCharCode(97 + count)}`);
        parentVarCount[s.variationOfId] = count + 1;
      }
    }
    return labels;
  })();

  const mainSlideCount = slides.filter((s) => !s.variationOfId).length;

  const handleApproveVariation = useCallback((variationIdx: number) => {
    const variation = slides[variationIdx];
    if (!variation.variationOfId) return;
    const parentIdx = slides.findIndex((s) => s.slide_id === variation.variationOfId);
    if (parentIdx === -1) return;
    // Replace parent image with the approved variation, remove all variations of that parent
    const newSlides = slides
      .map((s, i) => (i === parentIdx ? { ...s, image_url: variation.image_url } : s))
      .filter((s) => s.variationOfId !== variation.variationOfId)
      .map((s, i) => ({ ...s, slide_index: i }));
    usePresentationStore.setState({
      slides: newSlides,
      activeSlideIndex: Math.min(parentIdx, newSlides.length - 1),
    });
  }, [slides]);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSend = useCallback(async () => {
    if (!chatInput.trim() || isSendingChat) return;
    if (!slide?.image_url) {
      showToast('warning', 'No image', 'Generate a slide first before discussing.');
      return;
    }

    const userMsg = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'user' as const,
      content: chatInput.trim(),
      timestamp: Date.now(),
    };
    addChatMessage(userMsg);
    const sentText = chatInput.trim();
    setChatInput('');
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentImageBase64: slide.image_url.replace(/^data:image\/\w+;base64,/, ''),
          chatHistory: chatMessages.map((m) => ({ role: m.role, content: m.content })),
          newMessage: sentText,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 400 || res.status === 403) {
          showToast('warning', 'Safety Policy', data.error || 'Cannot process this request.');
          return;
        }
        throw new Error(data.error || 'Refinement failed');
      }

      const data = await res.json();

      // Update slide image if a new one was returned
      if (data.imageBase64) {
        updateSlide(activeSlideIndex, {
          image_url: `data:image/png;base64,${data.imageBase64}`,
        });
        addCost('nano_banana_image', 1);
      }

      // Add assistant response
      addChatMessage({
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: data.text || 'Updated the image based on your request.',
        timestamp: Date.now(),
        imageUrl: data.imageBase64 ? `data:image/png;base64,${data.imageBase64}` : undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      showToast('error', 'Refinement Error', msg);
    } finally {
      setIsSendingChat(false);
    }
  }, [chatInput, isSendingChat, slide, chatMessages, activeSlideIndex, addChatMessage, updateSlide, addCost, showToast]);

  return (
    <div
      style={{
        fontFamily: 'var(--font-sans)',
        background: 'var(--color-bg-canvas)',
        color: 'var(--color-text-primary)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <AtelierTopbar
        projectName={projectName}
        status="draft · auto-saved"
        costLabel={formatCost(sessionCost)}
        onHome={onHome}
        rightActions={
          <>
            <button className="atl-btn" onClick={onGallery} title="Browse and generate starting templates">
              <Layers size={13} /> Templates
            </button>
            <button
              className="atl-btn"
              onClick={() => setDrawer(drawer === 'style' ? null : 'style')}
              title="Set global style direction, negative prompts, and aspect ratio"
            >
              <Wand2 size={13} /> Style
            </button>
            <button
              className="atl-btn"
              onClick={() => setDrawer(drawer === 'discuss' ? null : 'discuss')}
              title="Chat with AI about this slide's content and design"
            >
              <MessageSquare size={13} /> Discuss
            </button>
            <button className="atl-btn atl-btn-pri" onClick={onExport} title="Export deck as PowerPoint or PDF">
              <Download size={13} /> Export
            </button>
          </>
        }
      />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '380px 1fr', minHeight: 0, overflow: 'hidden' }}>
        {/* Outline rail */}
        <div
          className="atl-side"
          style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--color-border-default)', overflow: 'hidden' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              borderBottom: '1px solid var(--color-border-default)',
            }}
          >
            <div className="atl-label" style={{ marginBottom: 0 }}>
              Outline · {mainSlideCount} slide{mainSlideCount !== 1 ? 's' : ''}
              {slides.length > mainSlideCount && (
                <span style={{ fontWeight: 400 }}> + {slides.length - mainSlideCount} var</span>
              )}
            </div>
            <button
              className="atl-btn"
              style={{ padding: '4px 8px', fontSize: 11 }}
              onClick={() => addSlide()}
              title="Add a new blank slide to the deck"
            >
              <Plus size={11} /> Add
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {slides.map((s, i) => {
              const isVariation = !!s.variationOfId;
              return (
                <div
                  key={s.slide_id}
                  className={`atl-outline-row ${i === activeSlideIndex ? 'on' : ''}`}
                  onClick={() => setActiveSlideIndex(i)}
                  style={isVariation ? { paddingLeft: 28 } : undefined}
                >
                <div
                  style={{
                    width: isVariation ? 52 : 64,
                    height: isVariation ? 32 : 40,
                    borderRadius: 4,
                    flexShrink: 0,
                    marginTop: 2,
                    overflow: 'hidden',
                    background: s.image_url ? undefined : 'var(--color-bg-hover)',
                    border: isVariation ? '1.5px dashed var(--color-border-default)' : undefined,
                  }}
                >
                  {s.image_url ? (
                    <img
                      src={s.image_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="atl-skel" style={{ width: '100%', height: '100%' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="atl-mono"
                    style={{
                      fontSize: 10,
                      color: 'var(--color-text-secondary)',
                      letterSpacing: '.06em',
                      marginBottom: 3,
                    }}
                  >
                    {slideLabels[i]} ·{' '}
                    {isVariation ? (
                      <span style={{ color: '#7c3aed' }}>variation</span>
                    ) : s.image_url ? (
                      <span style={{ color: 'var(--color-accent)' }}>rendered</span>
                    ) : (
                      <span>draft</span>
                    )}
                  </div>
                  <div
                    className="atl-serif"
                    style={{ fontSize: isVariation ? 13 : 15, lineHeight: 1.25, marginBottom: 3 }}
                  >
                    {s.title || 'Untitled slide'}
                  </div>
                  {!isVariation && (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--color-text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.subtitle || s.local_prompt || ' '}
                    </div>
                  )}
                </div>
                {isVariation && (
                  <button
                    className="atl-btn"
                    title="Approve this variation — replaces the parent slide"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApproveVariation(i);
                    }}
                    style={{
                      padding: '3px 8px',
                      fontSize: 10,
                      flexShrink: 0,
                      background: '#059669',
                      color: '#fff',
                      borderColor: '#059669',
                    }}
                  >
                    <Check size={10} /> Use
                  </button>
                )}
              </div>
              );
            })}
          </div>
        </div>

        {/* Stage + Inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
          {slide && (
            <>
              {/* Stage */}
              <div style={{ padding: '32px 32px 12px', display: 'flex', justifyContent: 'center' }}>
                <div
                  ref={stageRef}
                  onMouseDown={handleStageMouseDown}
                  onMouseMove={handleStageMouseMove}
                  onMouseUp={handleStageMouseUp}
                  onMouseLeave={handleStageMouseUp}
                  style={{
                    width: '100%',
                    maxWidth: 880,
                    aspectRatio: '16/9',
                    borderRadius: 6,
                    overflow: 'hidden',
                    boxShadow:
                      '0 30px 60px rgba(26,26,26,.08), 0 0 0 1px var(--color-border-default)',
                    background: 'var(--color-bg-hover)',
                    position: 'relative',
                    cursor: editMode ? 'crosshair' : 'default',
                    userSelect: editMode ? 'none' : undefined,
                  }}
                >
                  {slide.image_url ? (
                    <img
                      src={slide.image_url}
                      alt={slide.title}
                      onClick={() => { if (!editMode) setZoomed(true); }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: editMode ? 'brightness(0.6)' : undefined,
                        transition: 'filter 0.2s',
                        cursor: editMode ? undefined : 'zoom-in',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-text-secondary)',
                        fontSize: 14,
                      }}
                    >
                      No image generated yet
                    </div>
                  )}
                  {editMode && selBox && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${selBox.x}%`,
                        top: `${selBox.y}%`,
                        width: `${selBox.w}%`,
                        height: `${selBox.h}%`,
                        border: '2px solid var(--color-accent)',
                        background: 'rgba(250,248,244,0.18)',
                        borderRadius: 3,
                        pointerEvents: 'none',
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
                      }}
                    />
                  )}
                  {editMode && !selBox && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#faf8f4',
                        fontSize: 14,
                        fontWeight: 500,
                        pointerEvents: 'none',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Draw a box around the area to edit
                    </div>
                  )}
                </div>
              </div>

              {/* Edit prompt bar */}
              {editMode && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 8,
                    margin: '0 auto 8px',
                    maxWidth: 880,
                    width: '100%',
                    padding: '0 32px',
                  }}
                >
                  <input
                    className="atl-input"
                    style={{ flex: 1 }}
                    placeholder="Describe the edit — e.g. &quot;Change the heading to blue&quot;"
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSlideEdit();
                      if (e.key === 'Escape') {
                        setEditMode(false);
                        setSelBox(null);
                        setEditPrompt('');
                      }
                    }}
                    autoFocus
                  />
                  <button
                    className="atl-btn atl-btn-pri"
                    disabled={!selBox || !editPrompt.trim() || isEditing}
                    onClick={handleSlideEdit}
                  >
                    {isEditing ? 'Editing…' : 'Apply edit'}
                  </button>
                  <button
                    className="atl-btn"
                    onClick={() => {
                      setEditMode(false);
                      setSelBox(null);
                      setEditPrompt('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Stage toolbar */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
                <button
                  className="atl-btn"
                  title="Re-generate this slide's image from scratch"
                  onClick={handleGenerate}
                  disabled={isGeneratingSlide}
                >
                  <Sparkles size={12} /> {isGeneratingSlide ? 'Generating…' : 'Regenerate'}
                </button>
                <button
                  className="atl-btn"
                  title="Select a region of the slide to edit"
                  disabled={!slide?.image_url}
                  onClick={() => {
                    setEditMode(!editMode);
                    if (editMode) { setSelBox(null); setEditPrompt(''); }
                  }}
                  style={editMode ? { background: 'var(--color-accent)', color: '#fff', borderColor: 'var(--color-accent)' } : undefined}
                >
                  <Pencil size={12} /> Slide Edit
                </button>
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <button
                    className="atl-btn"
                    title="Generate alternative versions of this slide"
                    style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }}
                    onClick={handleVariations}
                    disabled={isGeneratingSlide}
                  >
                    <Copy size={12} /> Variations
                  </button>
                  <select
                    value={variationCount}
                    onChange={(e) => setVariationCount(Number(e.target.value))}
                    title="Number of variations to generate"
                    style={{
                      appearance: 'none',
                      background: 'var(--color-bg-canvas)',
                      border: '1px solid var(--color-border-button)',
                      borderTopRightRadius: 8,
                      borderBottomRightRadius: 8,
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      padding: '6px 10px 6px 8px',
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      cursor: 'pointer',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </div>
                <button
                  className="atl-btn"
                  title="Delete this slide"
                  onClick={() => setDeleteConfirmIdx(activeSlideIndex)}
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Delete confirmation */}
              {deleteConfirmIdx !== null && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 14,
                  padding: '10px 16px',
                  maxWidth: 880,
                  margin: '0 auto 14px',
                  background: 'color-mix(in srgb, #b91c1c 8%, transparent)',
                  border: '1px solid color-mix(in srgb, #b91c1c 25%, transparent)',
                  borderRadius: 8,
                  fontSize: 13,
                }}>
                  <span>Delete slide {slideLabels[deleteConfirmIdx] || String(deleteConfirmIdx + 1).padStart(2, '0')}?</span>
                  <button
                    className="atl-btn"
                    style={{ padding: '4px 12px', fontSize: 12, background: '#b91c1c', color: '#fff', borderColor: '#b91c1c' }}
                    onClick={() => {
                      deleteSlide(deleteConfirmIdx);
                      setDeleteConfirmIdx(null);
                      if (activeSlideIndex >= slides.length - 1 && activeSlideIndex > 0) {
                        setActiveSlideIndex(activeSlideIndex - 1);
                      }
                    }}
                  >
                    Yes, delete
                  </button>
                  <button
                    className="atl-btn"
                    style={{ padding: '4px 12px', fontSize: 12 }}
                    onClick={() => setDeleteConfirmIdx(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Inspector */}
              <div
                style={{
                  padding: '0 32px 32px',
                  maxWidth: 880,
                  width: '100%',
                  margin: '0 auto',
                }}
              >
                <div className="atl-card" style={{ padding: 24 }}>
                  <div
                    className="atl-serif"
                    style={{ fontSize: 22, letterSpacing: -0.5, marginBottom: 18 }}
                  >
                    Slide {slideLabels[activeSlideIndex] || String(activeSlideIndex + 1).padStart(2, '0')}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 14,
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <div className="atl-label">Title</div>
                      <input
                        className="atl-input"
                        value={slide.title}
                        onChange={(e) => handleUpdateField('title', e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="atl-label">Subtitle</div>
                      <input
                        className="atl-input"
                        value={slide.subtitle}
                        onChange={(e) => handleUpdateField('subtitle', e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div className="atl-label" style={{ display: 'flex', alignItems: 'center' }}>
                      Concept · what should this slide show?
                      <PromptStrengthener
                        value={slide.local_prompt}
                        context="slide concept"
                        onResult={(v) => handleUpdateField('local_prompt', v)}
                      />
                    </div>
                    <textarea
                      className="atl-ta"
                      value={slide.local_prompt}
                      rows={3}
                      onChange={(e) => handleUpdateField('local_prompt', e.target.value)}
                    />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div className="atl-label">Bullets</div>
                    <textarea
                      className="atl-ta"
                      value={slide.bullets.join('\n')}
                      rows={4}
                      onChange={(e) =>
                        handleUpdateField('bullets', e.target.value.split('\n'))
                      }
                    />
                  </div>

                  <details>
                    <summary
                      style={{
                        cursor: 'pointer',
                        fontSize: 12,
                        color: 'var(--color-text-secondary)',
                        fontWeight: 500,
                      }}
                    >
                      Speaker notes
                    </summary>
                    <textarea
                      className="atl-ta"
                      value={slide.speaker_notes}
                      rows={4}
                      style={{ marginTop: 10 }}
                      onChange={(e) => handleUpdateField('speaker_notes', e.target.value)}
                    />
                  </details>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Drawer */}
      {drawer && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 55,
            bottom: 0,
            width: 380,
            background: '#fff',
            borderLeft: '1px solid var(--color-border-default)',
            boxShadow: '-20px 0 40px rgba(0,0,0,.05)',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--color-border-default)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div className="atl-serif" style={{ fontSize: 18 }}>
              {drawer === 'discuss' ? 'Discuss this slide' : 'Deck style'}
            </div>
            <button
              onClick={() => setDrawer(null)}
              title="Close panel"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {drawer === 'discuss' && (
            <>
              <div
                style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {chatMessages.length === 0 && (
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, textAlign: 'center', marginTop: 32, lineHeight: 1.6 }}>
                    Chat with AI to refine your slide.<br />
                    e.g. &ldquo;Make the background darker&rdquo; or &ldquo;Add a subtitle&rdquo;
                  </div>
                )}
                {chatMessages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '88%',
                      padding: '10px 14px',
                      borderRadius: 14,
                      background:
                        m.role === 'user' ? 'var(--color-accent)' : 'var(--color-bg-sidebar)',
                      color: m.role === 'user' ? '#faf8f4' : 'var(--color-text-primary)',
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    {m.content}
                  </div>
                ))}
                {isSendingChat && (
                  <div
                    style={{
                      alignSelf: 'flex-start',
                      padding: '10px 14px',
                      borderRadius: 14,
                      background: 'var(--color-bg-sidebar)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <Loader2 size={14} style={{ animation: 'atl-spin 0.8s linear infinite' }} />
                    Refining slide…
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div
                style={{
                  padding: 14,
                  borderTop: '1px solid var(--color-border-default)',
                  display: 'flex',
                  gap: 6,
                }}
              >
                <input
                  className="atl-input"
                  placeholder={slide?.image_url ? 'Make the background darker…' : 'Generate a slide first…'}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) handleChatSend();
                  }}
                  disabled={isSendingChat || !slide?.image_url}
                />
                <button
                  className="atl-btn atl-btn-pri"
                  title="Send message"
                  disabled={!chatInput.trim() || isSendingChat || !slide?.image_url}
                  onClick={handleChatSend}
                >
                  {isSendingChat ? <Loader2 size={13} style={{ animation: 'atl-spin 0.8s linear infinite' }} /> : <Send size={13} />}
                </button>
              </div>
            </>
          )}

          {drawer === 'style' && (
            <div style={{ padding: 18, overflow: 'auto' }}>
              <div className="atl-label" style={{ display: 'flex', alignItems: 'center' }}>
                Direction
                <PromptStrengthener
                  value={globalPrompt}
                  context="global"
                  onResult={(v) => usePresentationStore.getState().setGlobalPrompt(v)}
                />
              </div>
              <textarea
                className="atl-ta"
                rows={4}
                value={globalPrompt}
                onChange={(e) => usePresentationStore.getState().setGlobalPrompt(e.target.value)}
              />
              <div style={{ height: 14 }} />
              <div className="atl-label" style={{ display: 'flex', alignItems: 'center' }}>
                Avoid
                <PromptStrengthener
                  value={negativePrompt}
                  context="negative prompt"
                  onResult={(v) => usePresentationStore.getState().setNegativePrompt(v)}
                />
              </div>
              <input
                className="atl-input"
                value={negativePrompt}
                onChange={(e) => usePresentationStore.getState().setNegativePrompt(e.target.value)}
              />
              <div style={{ height: 14 }} />
              <div className="atl-label">Aspect</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['16:9', '4:3', '9:16'] as const).map((ar) => (
                  <button
                    key={ar}
                    className="atl-btn"
                    onClick={() => usePresentationStore.getState().setAspectRatio(ar)}
                    style={{
                      flex: 1,
                      ...(ar === aspectRatio
                        ? {
                            background: 'var(--color-accent)',
                            color: '#fff',
                            borderColor: 'var(--color-accent)',
                          }
                        : {}),
                    }}
                  >
                    {ar}
                  </button>
                ))}
              </div>
              <button
                className="atl-btn atl-btn-pri"
                style={{ width: '100%', marginTop: 14, justifyContent: 'center' }}
                title="Apply style settings to all slides in the deck"
                onClick={handleApplyToDeck}
                disabled={isApplyingStyle}
              >
                <Sparkles size={13} /> {isApplyingStyle ? 'Applying…' : 'Apply to deck'}
              </button>
            </div>
          )}
        </div>
      )}
      {/* Zoom overlay */}
      {zoomed && slide?.image_url && (
        <div
          onClick={() => setZoomed(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            padding: 24,
          }}
        >
          <img
            src={slide.image_url}
            alt={slide.title}
            style={{
              maxWidth: '95vw',
              maxHeight: '95vh',
              objectFit: 'contain',
              borderRadius: 6,
              boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      )}
    </div>
  );
}
