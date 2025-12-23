"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UsageState {
    count: number;
    isSubscribed: boolean;
    increment: () => void;
    reset: () => void;
    setSubscribed: (status: boolean) => void;
}

// In a real app, this would sync with the server.
// For the demo/MVP, we use local simulation or sync in useEffect.
export const useUsageStore = create<UsageState>()(
    persist(
        (set) => ({
            count: 0,
            isSubscribed: false,
            increment: () => set((state) => ({ count: state.count + 1 })),
            reset: () => set({ count: 0 }),
            setSubscribed: (status) => set({ isSubscribed: status }),
        }),
        {
            name: "cosmic-usage-storage",
        }
    )
);

export const MAX_FREE_CONSULTATIONS = 3;
