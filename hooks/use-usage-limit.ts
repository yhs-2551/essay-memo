"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

interface UsageState {
    count: number;
    loading: boolean;
    isSubscribed: boolean;
    refreshUsage: () => Promise<void>;
    increment: () => void;
    setSubscribed: (value: boolean) => void;
}

export const useUsageStore = create<UsageState>((set) => ({
    count: 0,
    loading: true,
    isSubscribed: false,
    refreshUsage: async () => {
        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            set({ count: 0, loading: false });
            return;
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("consultation_count, last_consultation_date, subscription_tier")
            .eq("id", user.id)
            .single();

        if (profile) {
            const p = profile as any;
            const today = new Date();
            const lastDate = p.last_consultation_date ? new Date(p.last_consultation_date) : new Date(0);
            const isSameDay = today.toDateString() === lastDate.toDateString();

            // Check tier
            const isPro = p.subscription_tier === "pro";

            set({
                count: isSameDay ? p.consultation_count || 0 : 0,
                loading: false,
                isSubscribed: isPro, // Update accurate status
            });
        } else {
            set({ count: 0, loading: false, isSubscribed: false });
        }
    },
    increment: () => set((state) => ({ count: state.count + 1 })),
    setSubscribed: (value: boolean) => set({ isSubscribed: value }),
}));

export const MAX_FREE_CONSULTATIONS = 3;
