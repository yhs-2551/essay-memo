/**
 * Shared Types - 프로젝트 전역 타입 정의
 *
 * 모든 공유 타입을 한 곳에서 export
 */

// Re-export from constants
export type { PersonaId, SubscriptionTier, PostMode, SyncStatus } from './constants'

// Re-export from schemas
export type { CreatePostInput, UpdatePostInput, CreateMemoInput, AnalyzedData, Profile } from './schemas'

// Re-export from database types
export type { Database, Json } from '@/types/database.types'

// --- Additional Shared Types ---

// Blog Post (with consultation)
export interface Post {
    id: string
    user_id: string
    title: string
    content: string
    mode: 'standard' | 'consultation'
    is_published: boolean
    images: string[]
    created_at: string
    updated_at: string
}

// Memo
export interface Memo {
    id: string
    user_id: string
    content: string
    created_at: string
    updated_at: string
}

// Consultation (AI Analysis Result)
export interface Consultation {
    id: string
    user_id: string
    post_id: string
    analysis: string
    analysis_data: unknown
    created_at: string
}

// Draft (for auto-save)
export interface Draft<T> {
    data: T
    timestamp: number
    version: number
}

// API Response Types
export interface ApiResponse<T> {
    data?: T
    error?: string
    message?: string
}

export interface PaginatedResponse<T> {
    items: T[]
    hasMore: boolean
    total: number
}
