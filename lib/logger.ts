import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export type ActionType = "USER_LOGIN" | "USER_LOGOUT" | "POST_CREATE" | "POST_UPDATE" | "POST_DELETE" | "MEMO_CREATE" | "MEMO_DELETE" | "AI_ANALYSIS";

interface LogMetadata {
    [key: string]: any;
}

/**
 * Server-side activity logger
 * 사용자의 행동을 기록합니다. 민감한 정보(글 내용 등)는 절대 포함하지 마십시오.
 */
export async function logActivity(actionType: ActionType, metadata: LogMetadata = {}, userId?: string) {
    try {
        const supabase = await createClient();
        const headersList = await headers();

        // IP Address extraction (Best effort for server-less environments)
        let ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip");
        if (ip && ip.includes(",")) {
            ip = ip.split(",")[0].trim();
        }

        // User Agent
        const userAgent = headersList.get("user-agent");

        // If userId is not provided, try to get it from the session
        let effectiveUserId = userId;
        if (!effectiveUserId) {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            effectiveUserId = user?.id;
        }

        // Fire and forget - Insert log
        // 'activity_logs' insert requires valid permissions defined in RLS
        // We assume the supabase client here is the standard one (bound to user's permission)
        // If specific RLS is set (e.g. users can only insert their own rows), this works.
        await (supabase.from("activity_logs") as any).insert({
            user_id: effectiveUserId || null,
            action_type: actionType,
            metadata: metadata,
            ip_address: ip || null,
            user_agent: userAgent || null,
        });
    } catch (error) {
        // Logging should NOT block the main thread or cause the app to crash
        console.error("Failed to log activity:", error);
    }
}
