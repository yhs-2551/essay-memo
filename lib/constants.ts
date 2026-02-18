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
    { id: 'buddha', name: '붓다', desc: '집착을 내려놓을 때 비로소 자유로워진다', icon: '☸️' },
    { id: 'epictetus', name: '에픽테토스', desc: '내가 통제할 수 있는 것에만 집중하라', icon: '⚖️' },
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
    DAILY_FREE_LIMIT: 2, // Free 티어: 일 2회
    DAILY_PRO_LIMIT: 10, // Pro 티어: 일 10회 (마진율 75% 유지)
    TIMEOUT_MS: 10000,
} as const

// --- Persona Access Configuration ---
export const PERSONA_ACCESS = {
    FREE: ['prism'] as const, // Free는 프리즘만
    PRO: PERSONAS.map((p) => p.id) as readonly PersonaId[], // Pro는 전체 6개
} as const

// --- UI Configuration ---
export const UI_CONFIG = {
    AUTO_SAVE_DELAY_MS: 2000,
    LOCAL_SAVE_DELAY_MS: 500,
    TOAST_DURATION_MS: 3000,
    PAGINATION_LIMIT: 20,
} as const

// --- Image Upload Configuration ---
export const IMAGE_CONFIG = {
    // Per-image limits
    MAX_FILE_SIZE_MB: 5,
    MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,

    // Memo limits (5 images × 5MB = 25MB max)
    MEMO_MAX_COUNT: 5,
    MEMO_MAX_TOTAL_MB: 25,
    MEMO_MAX_TOTAL_BYTES: 25 * 1024 * 1024,

    // Blog/Essay limits (20 images × 5MB = 100MB max)
    BLOG_MAX_COUNT: 20,
    BLOG_MAX_TOTAL_MB: 100,
    BLOG_MAX_TOTAL_BYTES: 100 * 1024 * 1024,
} as const
