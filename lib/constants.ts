/**
 * Shared Constants - 프로젝트 전역 상수
 *
 * 중앙화된 상수 정의로 중복 제거 및 유지보수성 향상
 */

// --- Persona Definitions ---
export const PERSONAS = [
    { id: 'prism', name: '프리즘', desc: '내면의 균형을 찾아주는 따뜻한 빛', icon: '✨' },
    { id: 'nietzsche', name: '니체', desc: '고난을 축복으로 바꾸는 운명애', icon: '🔥' },
    { id: 'aurelius', name: '아우렐리우스', desc: '흔들리지 않는 평온한 바위', icon: '🏛️' },
    { id: 'jung', name: '칼 융', desc: '무의식의 그림자와 마주하는 용기', icon: '🌑' },
    { id: 'zhuangzi', name: '장자', desc: '자유롭게 비상하는 나비의 꿈', icon: '🦋' },
    { id: 'beauvoir', name: '보부아르', desc: '스스로를 정의하는 실존의 자유', icon: '👠' },
] as const

export type PersonaId = (typeof PERSONAS)[number]['id']

// --- Subscription Tiers ---
export const SUBSCRIPTION_TIERS = {
    FREE: 'free',
    PRO: 'pro',
} as const

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[keyof typeof SUBSCRIPTION_TIERS]

// --- Post Modes ---
export const POST_MODES = {
    STANDARD: 'standard',
    CONSULTATION: 'consultation',
} as const

export type PostMode = (typeof POST_MODES)[keyof typeof POST_MODES]

// --- Sync Status ---
export const SYNC_STATUS = {
    SYNCED: 'synced',
    LOCAL_ONLY: 'local-only',
    UPLOADING: 'uploading',
    ERROR: 'error',
} as const

export type SyncStatus = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS]

// --- AI Configuration ---
export const AI_CONFIG = {
    TEXT_MODEL: 'qwen/qwen3-32b',
    VISUAL_MODEL: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    DAILY_FREE_LIMIT: 3,
    TIMEOUT_MS: 10000,
} as const

// --- UI Configuration ---
export const UI_CONFIG = {
    AUTO_SAVE_DELAY_MS: 2000,
    LOCAL_SAVE_DELAY_MS: 500,
    TOAST_DURATION_MS: 3000,
    PAGINATION_LIMIT: 20,
} as const
