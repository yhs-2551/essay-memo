"use client";

import { useEffect } from "react";

/**
 * Hook to prevent accidental navigation when there are unsaved changes.
 * Note: Modern browsers primarily support the 'beforeunload' event for tab closing/refreshing.
 * For SPA navigation, we rely on the editor's logic, but this provides the core browser-level protection.
 */
/**
 * Hook to prevent accidental navigation when there are unsaved changes.
 * This implementation uses a 'History Trap' to handle the browser's back/forward buttons
 * in addition to the standard 'beforeunload' event.
 */
export function useNavigationWarning(shouldWarn: boolean) {
    useEffect(() => {
        if (!shouldWarn) return;

        // 1. Browser Tab/Refresh Protection
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };

        // 2. History Trap (Back/Forward Button Protection)
        // We push a dummy state so the first 'back' just pops this state
        window.history.pushState(null, "", window.location.href);

        const handlePopState = (e: PopStateEvent) => {
            if (shouldWarn) {
                const confirmed = window.confirm("작성 중인 내용이 사라질 수 있습니다. 정말 이동하시겠습니까?");
                if (!confirmed) {
                    // Push the trap back
                    window.history.pushState(null, "", window.location.href);
                } else {
                    // Let the navigation happen (we've already popped once, so just let it be)
                    // Wait, if we just let it be, we are at state 'A' (popped).
                    // We want to go to the PREVIOUS state.
                    // Since 'popstate' effectively puts us at 'A', and the user WANTED to go back (triggering pop from B->A),
                    // staying at A means we didn't leave.
                    // We need to force another back to actually leave A.
                    window.history.back();
                }
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        window.addEventListener("popstate", handlePopState);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            window.removeEventListener("popstate", handlePopState);
        };
    }, [shouldWarn]);
}
