'use client';

import { useState } from 'react';
import {
  Plus,
  Sparkles,
  ImageIcon,
  Copy,
  Trash2,
  Wand2,
  MessageSquare,
  Layers,
  Download,
  X,
  Send,
} from 'lucide-react';
import AtelierTopbar from './AtelierTopbar';
import PromptStrengthener from './PromptStrengthener';
import { usePresentationStore } from '@/store/presentationStore';
import { useCostStore } from '@/store/costStore';
import { formatCost } from '@/lib/calculateCost';

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
    chatMessages,
    globalPrompt,
    negativePrompt,
    aspectRatio,
  } = usePresentationStore();
  const { sessionCost } = useCostStore();
  const [drawer, setDrawer] = useState<null | 'discuss' | 'style'>(null);
  const [variationCount, setVariationCount] = useState(1);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);

  const slide = slides[activeSlideIndex];

  const handleUpdateField = (field: string, value: string | string[]) => {
    if (!slide) return;
    updateSlide(activeSlideIndex, { [field]: value });
  };

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

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '380px 1fr', minHeight: 0 }}>
        {/* Outline rail */}
        <div
          className="atl-side"
          style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--color-border-default)' }}
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
              Outline · {slides.length} slides
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
            {slides.map((s, i) => (
              <div
                key={s.slide_id}
                className={`atl-outline-row ${i === activeSlideIndex ? 'on' : ''}`}
                onClick={() => setActiveSlideIndex(i)}
              >
                <div
                  style={{
                    width: 64,
                    height: 40,
                    borderRadius: 4,
                    flexShrink: 0,
                    marginTop: 2,
                    overflow: 'hidden',
                    background: s.image_url ? undefined : 'var(--color-bg-hover)',
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
                    {String(i + 1).padStart(2, '0')} ·{' '}
                    {s.image_url ? (
                      <span style={{ color: 'var(--color-accent)' }}>rendered</span>
                    ) : (
                      <span>draft</span>
                    )}
                  </div>
                  <div
                    className="atl-serif"
                    style={{ fontSize: 15, lineHeight: 1.25, marginBottom: 3 }}
                  >
                    {s.title || 'Untitled slide'}
                  </div>
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
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stage + Inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
          {slide && (
            <>
              {/* Stage */}
              <div style={{ padding: '32px 32px 12px', display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 880,
                    aspectRatio: '16/9',
                    borderRadius: 6,
                    overflow: 'hidden',
                    boxShadow:
                      '0 30px 60px rgba(26,26,26,.08), 0 0 0 1px var(--color-border-default)',
                    background: 'var(--color-bg-hover)',
                  }}
                >
                  {slide.image_url ? (
                    <img
                      src={slide.image_url}
                      alt={slide.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                </div>
              </div>

              {/* Stage toolbar */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
                <button className="atl-btn" title="Re-generate this slide's image from scratch">
                  <Sparkles size={12} /> Regenerate
                </button>
                <button className="atl-btn" title="Paint over a region of the image to fix or change part of it">
                  <ImageIcon size={12} /> Inpaint region
                </button>
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <button
                    className="atl-btn"
                    title="Generate alternative versions of this slide"
                    style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }}
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
                  <span>Delete slide {String(deleteConfirmIdx + 1).padStart(2, '0')}?</span>
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
                    Slide {String(activeSlideIndex + 1).padStart(2, '0')}
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
              </div>
              <div
                style={{
                  padding: 14,
                  borderTop: '1px solid var(--color-border-default)',
                  display: 'flex',
                  gap: 6,
                }}
              >
                <input className="atl-input" placeholder="Make the headline tighter…" />
                <button className="atl-btn atl-btn-pri" title="Send message">
                  <Send size={13} />
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
              >
                <Sparkles size={13} /> Apply to deck
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
