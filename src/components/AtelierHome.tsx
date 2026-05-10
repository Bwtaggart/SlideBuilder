'use client';

import { DollarSign, Plus, Upload } from 'lucide-react';
import { useProjectStore, type SavedProject } from '@/store/projectStore';
import { useCostStore } from '@/store/costStore';
import { formatCost } from '@/lib/calculateCost';

interface AtelierHomeProps {
  onOpenProject: (project: SavedProject) => void;
  onNew: () => void;
}

export default function AtelierHome({ onOpenProject, onNew }: AtelierHomeProps) {
  const { projects, isLoaded } = useProjectStore();
  const { sessionCost, breakdown } = useCostStore();
  const empty = isLoaded && projects.length === 0;

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
      {/* Home topbar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 32px',
          borderBottom: '1px solid var(--color-border-default)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--color-accent)',
            }}
          />
          <span className="atl-serif" style={{ fontSize: 18, letterSpacing: -0.3 }}>
            Slidebuilder
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="atl-btn atl-btn-ghost" style={{ fontSize: 12 }} title="Restore a deck from a backup file">
            <Upload size={12} /> Restore backup
          </button>
          <span className="atl-cost" title="Total API cost this session">
            <DollarSign size={11} /> {formatCost(sessionCost)}
          </span>
          <button className="atl-btn atl-btn-pri" onClick={onNew} title="Create a new presentation from scratch">
            <Plus size={14} /> New deck
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 32px 80px' }}>
          {empty ? (
            /* Empty / first-run state */
            <div style={{ textAlign: 'center', padding: '72px 0' }}>
              <div
                className="atl-mono"
                style={{
                  fontSize: 11,
                  letterSpacing: '.18em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 18,
                }}
              >
                Welcome
              </div>
              <h1
                className="atl-serif"
                style={{
                  fontSize: 54,
                  fontWeight: 400,
                  letterSpacing: -1.2,
                  margin: '0 0 14px',
                  lineHeight: 1.05,
                }}
              >
                Begin with an{' '}
                <em style={{ color: 'var(--color-accent)' }}>empty page</em>.
              </h1>
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: 'var(--color-text-secondary)',
                  maxWidth: 520,
                  margin: '0 auto 36px',
                }}
              >
                Slidebuilder turns rough notes and reference shots into finished decks.
                Pick a starting template, dictate the look, then let the editor do the
                heavy lifting.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  className="atl-btn atl-btn-pri"
                  onClick={onNew}
                  style={{ fontSize: 14, padding: '12px 22px' }}
                  title="Create a new presentation from scratch"
                >
                  <Plus size={14} /> Start a new deck
                </button>
                <button className="atl-btn" style={{ fontSize: 14, padding: '12px 18px' }} title="Import an existing PowerPoint file">
                  <Upload size={14} /> Import .pptx
                </button>
              </div>
            </div>
          ) : (
            /* Returning user state */
            <>
              <div
                style={{
                  marginBottom: 48,
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'flex-end',
                  gap: 24,
                }}
              >
                <div>
                  <div
                    className="atl-mono"
                    style={{
                      fontSize: 11,
                      letterSpacing: '.18em',
                      textTransform: 'uppercase',
                      color: 'var(--color-text-secondary)',
                      marginBottom: 14,
                    }}
                  >
                    Editorial · pitch · narrative
                  </div>
                  <h1
                    className="atl-serif"
                    style={{
                      fontSize: 56,
                      fontWeight: 400,
                      letterSpacing: -1.5,
                      margin: 0,
                      lineHeight: 1.05,
                    }}
                  >
                    {projects.length} deck{projects.length !== 1 ? 's' : ''} in flight.
                  </h1>
                </div>
                <div className="atl-card" style={{ padding: 18, minWidth: 260 }}>
                  <div className="atl-label">This month</div>
                  <div className="atl-serif" style={{ fontSize: 34, letterSpacing: -1, marginBottom: 4 }}>
                    {formatCost(breakdown.monthly)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    Session cost — {formatCost(sessionCost)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 20,
                }}
              >
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="atl-card atl-tile"
                    style={{ overflow: 'hidden' }}
                    onClick={() => onOpenProject(p)}
                  >
                    <div
                      style={{
                        aspectRatio: '4/3',
                        background: 'var(--color-bg-hover)',
                        overflow: 'hidden',
                      }}
                    >
                      {p.thumbnailUrl ? (
                        <img
                          src={p.thumbnailUrl}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="atl-skel" style={{ width: '100%', height: '100%' }} />
                      )}
                    </div>
                    <div style={{ padding: '14px 16px' }}>
                      <div
                        className="atl-serif"
                        style={{
                          fontSize: 18,
                          letterSpacing: -0.3,
                          marginBottom: 6,
                          lineHeight: 1.2,
                        }}
                      >
                        {p.name}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 11,
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        <span className="atl-mono">
                          {p.slides?.length ?? 0} slides
                        </span>
                        <span>
                          {new Date(p.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
