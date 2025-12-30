import { describe, it, expect } from 'vitest'
import { CreatePostSchema, UpdatePostSchema, CreateMemoSchema, AnalyzedDataSchema } from '@/lib/schemas'

describe('Zod Schemas Validation', () => {
    describe('CreatePostSchema', () => {
        it('should validate valid post data', () => {
            const data = {
                title: 'Valid Title',
                content: 'Valid Content',
                mode: 'standard',
                persona: 'prism',
            }
            const result = CreatePostSchema.safeParse(data)
            expect(result.success).toBe(true)
        })

        it('should fail if title is empty', () => {
            const data = {
                title: '',
                content: 'Valid Content',
                mode: 'standard',
            }
            const result = CreatePostSchema.safeParse(data)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.flatten().fieldErrors.title).toContain('제목을 입력해주세요')
            }
        })

        it('should fail if title is too long (>100)', () => {
            const data = {
                title: 'a'.repeat(101),
                content: 'Valid Content',
                mode: 'standard',
            }
            const result = CreatePostSchema.safeParse(data)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.flatten().fieldErrors.title).toContain('제목은 100자를 초과할 수 없습니다')
            }
        })

        it('should fail if content is empty', () => {
            const data = {
                title: 'Valid Title',
                content: '',
                mode: 'standard',
            }
            const result = CreatePostSchema.safeParse(data)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.flatten().fieldErrors.content).toContain('내용을 입력해주세요')
            }
        })

        it('should fail if content is too long (>30000)', () => {
            const data = {
                title: 'Valid Title',
                content: 'a'.repeat(30001),
                mode: 'standard',
            }
            const result = CreatePostSchema.safeParse(data)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.flatten().fieldErrors.content).toContain('내용은 30,000자를 초과할 수 없습니다 (약 100KB)')
            }
        })
    })

    describe('UpdatePostSchema', () => {
        it('should allow partial updates', () => {
            const data = {
                title: 'Updated Title',
            }
            const result = UpdatePostSchema.safeParse(data)
            expect(result.success).toBe(true)
        })

        it('should validate partial constraints if field is present', () => {
            const data = {
                title: '',
            }
            const result = UpdatePostSchema.safeParse(data)
            expect(result.success).toBe(false)
        })
    })

    describe('CreateMemoSchema', () => {
        it('should validate valid memo', () => {
            const data = {
                content: 'Valid Memo',
            }
            const result = CreateMemoSchema.safeParse(data)
            expect(result.success).toBe(true)
        })

        it('should fail if content > 1000', () => {
            const data = {
                content: 'a'.repeat(1001),
            }
            const result = CreateMemoSchema.safeParse(data)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.flatten().fieldErrors.content).toContain('단상은 1,000자를 초과할 수 없습니다')
            }
        })
    })

    describe('AnalyzedDataSchema', () => {
        it('should validate correct structure', () => {
            const data = {
                meta: {
                    model: 'gpt-4',
                    timestamp: new Date().toISOString(),
                    persona: 'prism',
                },
                sentiment: {
                    primaryEmotion_ko: '기쁨',
                    primaryEmotion_en: 'Joy',
                    intensity: 0.8,
                },
                philosophy: {
                    lens_ko: '실존주의',
                    lens_en: 'Existentialism',
                    summary_ko: '요약',
                    keywords_en: ['keyword'],
                },
                life_data: {
                    summary: '요약',
                    growth_point: '성장',
                    suggested_actions: ['action'],
                },
                vision: {
                    objects_ko: ['obj'],
                    objects_en: ['obj'],
                    mood_ko: 'mood',
                    mood_en: 'mood',
                },
            }
            const result = AnalyzedDataSchema.safeParse(data)
            expect(result.success).toBe(true)
        })
    })
})
