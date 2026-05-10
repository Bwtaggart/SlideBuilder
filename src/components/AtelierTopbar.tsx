'use client';

import { ArrowLeft, DollarSign } from 'lucide-react';

interface AtelierTopbarProps {
  projectName: string;
  status?: string;
  costLabel?: string;
  onHome?: () => void;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
}

export default function AtelierTopbar({
  projectName,
  status,
  costLabel = '$0.00',
  onHome,
  leftActions,
  rightActions,
}: AtelierTopbarProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid var(--color-border-default)',
        background: 'var(--color-bg-canvas)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {onHome && (
          <button onClick={onHome} className="atl-btn" style={{ padding: '6px 10px' }} title="Back to home">
            <ArrowLeft size={13} />
          </button>
        )}
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'var(--color-accent)',
            flexShrink: 0,
          }}
        />
        <span
          className="atl-serif"
          style={{
            fontSize: 16,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {projectName}
        </span>
        {status && <span className="atl-chip">{status}</span>}
        {leftActions}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {rightActions}
        <span className="atl-cost" title="Total API cost this session">
          <DollarSign size={11} />
          {costLabel}
        </span>
      </div>
    </header>
  );
}
