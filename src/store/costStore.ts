import { create } from 'zustand';
import { calculateCost, formatCost } from '@/lib/calculateCost';
import { deleteCostEventsBefore, getCostEventsSince, putCostEvent } from '@/lib/idb';
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

        const timestamp = Date.now();
        const eventId = `${timestamp}-${Math.random().toString(36).slice(2, 9)}`;
        void putCostEvent({
            id: eventId,
            timestamp,
            serviceType,
            usageAmount,
            cost,
        }).then(() => get().fetchBreakdown());
    },

    resetSessionCost: () => set({ sessionCost: 0 }),

    fetchBreakdown: async () => {
        set({ isLoadingBreakdown: true });
        try {
            const now = new Date();

            // Retain at most 13 months of local cost history.
            const retentionCutoff = new Date(now);
            retentionCutoff.setMonth(retentionCutoff.getMonth() - 13);
            await deleteCostEventsBefore(retentionCutoff.getTime());

            const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

            const events = await getCostEventsSince(monthStart);
            let daily = 0;
            let weekly = 0;
            let monthly = 0;

            for (const event of events) {
                monthly += event.cost;
                if (event.timestamp >= weekStart) weekly += event.cost;
                if (event.timestamp >= dayStart) daily += event.cost;
            }

            set({ breakdown: { daily, weekly, monthly } });
        } catch {
            // If IndexedDB is unavailable, keep existing breakdown values.
        } finally {
            set({ isLoadingBreakdown: false });
        }
    },

    getFormattedSessionCost: () => formatCost(get().sessionCost),
}));
