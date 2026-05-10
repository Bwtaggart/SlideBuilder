'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AtelierTopbar from './AtelierTopbar';
import { usePresentationStore } from '@/store/presentationStore';
import { useCostStore } from '@/store/costStore';
import { formatCost, calculateCost } from '@/lib/calculateCost';
import { isBlankTemplate } from '@/lib/template';

interface AtelierGeneratingProps {
  projectName: string;
  onDone: () => void;
  onHome: () => void;
}

export default function AtelierGenerating({
  projectName,
  onDone,
  onHome,
}: AtelierGeneratingProps) {
  const {
    slides,
    selectedTemplate,
    negativePrompt,
    aspectRatio,
    updateSlide,
    setIsGeneratingSlide,
  } = usePresentationStore();
  const { sessionCost, addCost } = useCostStore();

  const [renderStatus, setRenderStatus] = useState<('queued' | 'rendering' | 'rendered' | 'failed')[]>(
    () => slides.map((s) => (s.image_url ? 'rendered' : 'queued')),
  );
  const [runCost, setRunCost] = useState(0);
  const [, setStopped] = useState(false);
  const stoppedRef = useRef(false);
  const generatingRef = useRef(false);

  const completed = renderStatus.filter((s) => s === 'rendered').length;
  const currentIdx = renderStatus.findIndex((s) => s === 'rendering');
  const total = slides.length;

  const generateSlide = useCallback(
    async (index: number) => {
      const slide = slides[index];
      if (!slide || slide.image_url) return true;

      setRenderStatus((prev) => {
        const next = [...prev];
        next[index] = 'rendering';
        return next;
      });

      try {
        const isBlank = isBlankTemplate(selectedTemplate);
        const resp = await fetch('/api/generate-slide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateBase64: isBlank ? null : selectedTemplate?.base64,
            templateId: selectedTemplate?.id || 'blank-template',
            slidePrompt: slide.local_prompt || `${slide.title}. ${slide.subtitle}`,
            title: slide.title,
            subtitle: slide.subtitle,
            bullets: slide.bullets,
            aspectRatio,
            negativePrompt: `${negativePrompt}`,
          }),
        });
        const data = await resp.json();
        if (data.error) throw new Error(data.error);

        const imageUrl = `data:image/png;base64,${data.imageBase64}`;
        updateSlide(index, { image_url: imageUrl });
        addCost('nano_banana_image', 1);
        setRunCost((prev) => prev + calculateCost('nano_banana_image', 1));

        setRenderStatus((prev) => {
          const next = [...prev];
          next[index] = 'rendered';
          return next;
        });
        return true;
      } catch (err) {
        console.error(`Slide ${index + 1} generation failed:`, err);
        setRenderStatus((prev) => {
          const next = [...prev];
          next[index] = 'failed';
          return next;
        });
        return false;
      }
    },
    [slides, selectedTemplate, aspectRatio, negativePrompt, updateSlide, addCost],
  );

  useEffect(() => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setIsGeneratingSlide(true);

    (async () => {
      for (let i = 0; i < slides.length; i++) {
        if (stoppedRef.current) break;
        if (slides[i].image_url) {
          setRenderStatus((prev) => {
            const next = [...prev];
            next[i] = 'rendered';
            return next;
          });
          continue;
        }
        await generateSlide(i);
      }
      setIsGeneratingSlide(false);
      if (!stoppedRef.current) {
        onDone();
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStop = () => {
    stoppedRef.current = true;
    setStopped(true);
    setIsGeneratingSlide(false);
    onDone();
  };

  const activeSlide = slides[currentIdx >= 0 ? currentIdx : Math.min(completed, total - 1)];

  return (
    <div
      style={{
        fontFamily: 'var(--font-sans)',
        background: 'var(--color-bg-canvas)',
        color: 'var(--color-text-primary)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AtelierTopbar
        projectName={projectName}
        status="generating · auto-saved"
        costLabel={formatCost(sessionCost)}
        onHome={onHome}
      />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '380px 1fr', minHeight: 0 }}>
        {/* Outline rail */}
        <div
          className="atl-side"
          style={{
            borderRight: '1px solid var(--color-border-default)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--color-border-default)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div className="atl-label" style={{ marginBottom: 0 }}>
              Outline · {total} slides
            </div>
            <span className="atl-mono" style={{ fontSize: 11, color: 'var(--color-accent)' }}>
              {completed}/{total}
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {slides.map((s, i) => {
              const status = renderStatus[i] || 'queued';
              const isActive =
                status === 'rendering' || (currentIdx === -1 && i === Math.min(completed, total - 1));
              return (
                <div key={s.slide_id} className={`atl-outline-row ${isActive ? 'on' : ''}`}>
                  <div
                    style={{
                      width: 64,
                      height: 40,
                      borderRadius: 4,
                      flexShrink: 0,
                      marginTop: 2,
                      position: 'relative',
                      overflow: 'hidden',
                      background: 'var(--color-bg-hover)',
                    }}
                  >
                    {status === 'rendered' && s.image_url ? (
                      <img
                        src={s.image_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="atl-skel" style={{ position: 'absolute', inset: 0 }} />
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')} ·
                      {status === 'rendered' ? (
                        <span style={{ color: 'var(--color-accent)' }}>rendered</span>
                      ) : status === 'rendering' ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: 'var(--color-accent)',
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: 'var(--color-accent)',
                              animation: 'atl-pulse 1s infinite',
                            }}
                          />
                          rendering…
                        </span>
                      ) : status === 'failed' ? (
                        <span style={{ color: '#b91c1c' }}>failed</span>
                      ) : (
                        <span>queued</span>
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
                      {s.subtitle || s.local_prompt || ' '}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stage */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 760,
              aspectRatio: '16/9',
              borderRadius: 6,
              overflow: 'hidden',
              position: 'relative',
              boxShadow:
                '0 30px 60px rgba(26,26,26,.08), 0 0 0 1px var(--color-border-default)',
              background: 'var(--color-bg-hover)',
            }}
          >
            {activeSlide?.image_url ? (
              <img
                src={activeSlide.image_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%' }} />
            )}

            {currentIdx >= 0 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(250,248,244,.86)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    border: '3px solid color-mix(in srgb, var(--color-accent) 19%, transparent)',
                    borderTopColor: 'var(--color-accent)',
                    borderRadius: '50%',
                    animation: 'atl-spin 0.9s linear infinite',
                  }}
                />
                <div
                  className="atl-mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-secondary)',
                    letterSpacing: '.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  Rendering slide {currentIdx + 1}
                </div>
                <div className="atl-serif" style={{ fontSize: 22 }}>
                  {slides[currentIdx]?.title || 'Untitled'}
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 20, width: '100%', maxWidth: 760 }}>
            <div
              style={{
                height: 4,
                background: 'var(--color-bg-hover)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(completed / total) * 100}%`,
                  height: '100%',
                  background: 'var(--color-accent)',
                  transition: 'width .3s',
                }}
              />
            </div>
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: 'var(--color-text-secondary)',
              }}
            >
              <span>
                Generating deck · {completed}/{total} rendered
              </span>
              <span className="atl-mono">+{formatCost(runCost)} this run</span>
            </div>
          </div>

          <button className="atl-btn" style={{ marginTop: 20 }} onClick={handleStop} title="Stop generating and review the slides that have been rendered so far">
            Stop and review what&apos;s done
          </button>
        </div>
      </div>
    </div>
  );
}
