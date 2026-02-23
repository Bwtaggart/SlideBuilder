'use client';

import { useState, useEffect, useRef } from 'react';
import { DollarSign, TrendingUp, Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { useCostStore } from '@/store/costStore';
import { formatCost } from '@/lib/calculateCost';

export default function CostWidget() {
    const { sessionCost, breakdown, fetchBreakdown } = useCostStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchBreakdown();
    }, [fetchBreakdown]);

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsExpanded(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => setIsExpanded(false), 300);
    };

    return (
        <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ position: 'relative' }}
        >
            {/* Badge */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border-default)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: 13,
                    fontFamily: 'var(--font-mono)',
                    color: sessionCost > 0 ? 'var(--color-accent-green)' : 'var(--color-text-muted)',
                }}
            >
                <DollarSign size={14} />
                <span>Session: {formatCost(sessionCost)}</span>
            </div>

            {/* Expanded Dropdown */}
            {isExpanded && (
                <div
                    className="glass-panel"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: 8,
                        padding: 16,
                        minWidth: 220,
                        animation: 'slide-up 0.2s ease-out',
                        zIndex: 100,
                    }}
                >
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 12, fontWeight: 600 }}>
                        Cost Breakdown
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <CostRow icon={<TrendingUp size={14} />} label="Session" value={sessionCost} color="var(--color-accent-green)" />
                        <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />
                        <CostRow icon={<Calendar size={14} />} label="Today" value={breakdown.daily} color="var(--color-accent-cyan)" />
                        <CostRow icon={<CalendarDays size={14} />} label="This Week" value={breakdown.weekly} color="var(--color-accent-blue)" />
                        <CostRow icon={<CalendarRange size={14} />} label="This Month" value={breakdown.monthly} color="var(--color-accent-purple)" />
                    </div>
                </div>
            )}
        </div>
    );
}

function CostRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)', fontSize: 13 }}>
                <span style={{ color }}>{icon}</span>
                {label}
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color }}>{formatCost(value)}</span>
        </div>
    );
}
