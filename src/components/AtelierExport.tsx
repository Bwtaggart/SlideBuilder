'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Layers, Download } from 'lucide-react';
import { usePresentationStore } from '@/store/presentationStore';

interface AtelierExportProps {
  projectName: string;
  onClose: () => void;
  onExport: (format: 'pptx' | 'pdf', mode: 'hybrid' | 'image') => void;
}

export default function AtelierExport({ projectName, onClose, onExport }: AtelierExportProps) {
  const [fmt, setFmt] = useState<'pptx' | 'pdf'>('pptx');
  const [filenameOverride, setFilenameOverride] = useState('');
  const { slides, aspectRatio, pptxExportMode, setPptxExportMode } = usePresentationStore();
  const mode = pptxExportMode === 'hybrid_editable' ? 'hybrid' as const : 'image' as const;
  const setMode = (m: 'hybrid' | 'image') => setPptxExportMode(m === 'hybrid' ? 'hybrid_editable' : 'image');
  const defaultFilename = useMemo(() => {
    const base = projectName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
    return `${base}.${fmt}`;
  }, [projectName, fmt]);
  const filename = filenameOverride || defaultFilename;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,26,26,.42)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        zIndex: 40,
      }}
    >
      <div
        className="atl-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 680,
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 40px 80px rgba(0,0,0,.18)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 26px',
            borderBottom: '1px solid var(--color-border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              className="atl-mono"
              style={{
                fontSize: 10,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: 'var(--color-text-secondary)',
              }}
            >
              Export
            </div>
            <div className="atl-serif" style={{ fontSize: 24, marginTop: 4 }}>
              Send the deck out into the world
            </div>
          </div>
          <button className="atl-btn atl-btn-ghost" onClick={onClose} title="Close export dialog">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '22px 26px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {/* Format */}
          <div>
            <div className="atl-label">Format</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([
                {
                  id: 'pptx' as const,
                  icon: <Layers size={14} />,
                  name: 'PowerPoint (.pptx)',
                  sub: 'Editable in Keynote, PowerPoint, Slides.',
                },
                {
                  id: 'pdf' as const,
                  icon: <Download size={14} />,
                  name: 'PDF',
                  sub: 'Pixel-faithful, share-ready.',
                },
              ]).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFmt(f.id)}
                  className="atl-card"
                  style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    border:
                      fmt === f.id
                        ? '2px solid var(--color-accent)'
                        : '1px solid var(--color-border-default)',
                    background:
                      fmt === f.id
                        ? 'color-mix(in srgb, var(--color-accent) 5%, transparent)'
                        : '#fff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: fmt === f.id ? 'var(--color-accent)' : 'var(--color-text-primary)',
                      marginBottom: 4,
                    }}
                  >
                    {f.icon}
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{f.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{f.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Fidelity (pptx only) */}
          {fmt === 'pptx' && (
            <div>
              <div className="atl-label">Layout fidelity</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {([
                  {
                    id: 'hybrid' as const,
                    name: 'Hybrid editable',
                    sub: 'Image background + native PowerPoint text boxes for title, subtitle, bullets. Best for collaborators who want to tweak copy.',
                    rec: true,
                  },
                  {
                    id: 'image' as const,
                    name: 'Image only',
                    sub: 'Each slide is a single image. Pixel-perfect but text is not editable.',
                  },
                ]).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className="atl-card"
                    style={{
                      padding: '12px 14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      border:
                        mode === m.id
                          ? '2px solid var(--color-accent)'
                          : '1px solid var(--color-border-default)',
                      background:
                        mode === m.id
                          ? 'color-mix(in srgb, var(--color-accent) 5%, transparent)'
                          : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: `2px solid ${mode === m.id ? 'var(--color-accent)' : 'var(--color-border-button)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {mode === m.id && (
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: 'var(--color-accent)',
                          }}
                        />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                        }}
                      >
                        {m.name}{' '}
                        {m.rec && <span className="atl-chip">recommended</span>}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--color-text-secondary)',
                          marginTop: 3,
                          lineHeight: 1.5,
                        }}
                      >
                        {m.sub}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filename */}
          <div>
            <div className="atl-label">Filename</div>
            <input
              className="atl-input"
              value={filename}
              onChange={(e) => setFilenameOverride(e.target.value)}
            />
          </div>

          {/* Summary callout */}
          <div
            className="atl-card"
            style={{
              padding: '12px 14px',
              background: 'color-mix(in srgb, var(--color-accent) 5%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-accent) 25%, transparent)',
              fontSize: 12,
              lineHeight: 1.55,
            }}
          >
            <strong>Ready when you are.</strong> {slides.length} slides · {aspectRatio} ·
            estimated export.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 26px',
            borderTop: '1px solid var(--color-border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--color-bg-canvas)',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Saved to your downloads folder.
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="atl-btn" onClick={onClose} title="Cancel and return to editing">
              Cancel
            </button>
            <button
              className="atl-btn atl-btn-pri"
              onClick={() => onExport(fmt, mode)}
              title={`Download deck as ${fmt.toUpperCase()} file`}
            >
              <Download size={13} /> Export {fmt.toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
