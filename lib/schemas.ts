/**
 * Shared Zod Schemas - 프로젝트 전역 스키마
 *
 * 타입 안전성을 위한 중앙화된 Zod 스키마 정의
 */

import { z } from 'zod'

// --- Post Schemas ---
export const CreatePostSchema = z.object({
    title: z.string().min(1, '제목을 입력해주세요'),
    content: z.string().min(1, '내용을 입력해주세요'),
    mode: z.enum(['standard', 'consultation']),
    is_published: z.boolean().optional(),
    images: z.array(z.string().url()).optional(),
    persona: z.string().optional(),
})

export const UpdatePostSchema = CreatePostSchema.partial()

// --- Memo Schemas ---
export const CreateMemoSchema = z.object({
    content: z.string().min(1, '내용을 입력해주세요'),
})

export const UpdateMemoSchema = CreateMemoSchema.partial()

// --- AI Analysis Schemas ---
export const AnalyzedDataSchema = z.object({
    meta: z.object({
        model: z.string(),
        timestamp: z.string(),
        persona: z.string().optional(),
    }),
    sentiment: z.object({
        primaryEmotion_ko: z.string(),
        primaryEmotion_en: z.string(),
        intensity: z.number().min(0).max(1),
    }),
    philosophy: z.object({
        lens_ko: z.string(),
        lens_en: z.string(),
        summary_ko: z.string(),
        keywords_en: z.array(z.string()),
    }),
    life_data: z.object({
        summary: z.string(),
        growth_point: z.string(),
        suggested_actions: z.array(z.string()),
    }),
    vision: z
        .object({
            objects_ko: z.array(z.string()),
            objects_en: z.array(z.string()),
            mood_ko: z.string(),
            mood_en: z.string(),
        })
        .nullable(),
})

// --- Profile Schemas ---
export const ProfileSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    consultation_count: z.number().int().min(0),
    last_consultation_date: z.string().nullable(),
    subscription_tier: z.enum(['free', 'pro']),
    preferences: z.record(z.unknown()).nullable(),
})

// --- Inferred Types ---
export type CreatePostInput = z.infer<typeof CreatePostSchema>
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>
export type CreateMemoInput = z.infer<typeof CreateMemoSchema>
export type AnalyzedData = z.infer<typeof AnalyzedDataSchema>
export type Profile = z.infer<typeof ProfileSchema>
