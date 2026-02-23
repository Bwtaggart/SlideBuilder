import { create } from 'zustand';
import { calculateCost, formatCost } from '@/lib/calculateCost';
import type { ServiceType, CostBreakdown } from '@/lib/types';

interface CostState {
    sessionCost: number;
    breakdown: CostBreakdown;
    isLoadingBreakdown: boolean;

    addCost: (serviceType: ServiceType, usageAmount: number) => void;
    resetSessionCost: () => void;
    fetchBreakdown: () => Promise<void>;
    getFormattedSessionCost: () => string;
}

export const useCostStore = create<CostState>((set, get) => ({
    sessionCost: 0,
    breakdown: { daily: 0, weekly: 0, monthly: 0 },
    isLoadingBreakdown: false,

    addCost: (serviceType, usageAmount) => {
        const cost = calculateCost(serviceType, usageAmount);
        set((state) => ({ sessionCost: state.sessionCost + cost }));
    },

    resetSessionCost: () => set({ sessionCost: 0 }),

    fetchBreakdown: async () => {
        set({ isLoadingBreakdown: true });
        try {
            const res = await fetch('/api/usage-stats');
            if (res.ok) {
                const data = await res.json();
                set({ breakdown: data });
            }
        } catch {
            // Supabase not configured — use session only
        } finally {
            set({ isLoadingBreakdown: false });
        }
    },

    getFormattedSessionCost: () => formatCost(get().sessionCost),
}));
