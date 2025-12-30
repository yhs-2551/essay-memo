import { describe, it, expect, vi } from 'vitest'
import { handleApiError, formatZodErrors, isNetworkError, safeJsonParse } from '@/lib/error-handler'
import { toast } from 'sonner'

// Mock sonner toast
vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
    },
}))

describe('error-handler', () => {
    describe('handleApiError', () => {
        it('Error 객체를 올바르게 파싱', () => {
            const error = new Error('테스트 에러')

            const result = handleApiError(error, '기본 메시지', false)

            expect(result.message).toBe('테스트 에러')
        })

        it('message 속성을 가진 객체를 파싱', () => {
            const error = { message: '커스텀 에러', code: '400' }

            const result = handleApiError(error, '기본 메시지', false)

            expect(result.message).toBe('커스텀 에러')
        })

        it('알 수 없는 에러 타입은 fallback 메시지 사용', () => {
            const error = 'string error'

            const result = handleApiError(error, '알 수 없는 오류', false)

            expect(result.message).toBe('알 수 없는 오류')
        })

        it('showToast가 true면 toast.error 호출', () => {
            const error = new Error('토스트 테스트')

            handleApiError(error, '기본 메시지', true)

            expect(toast.error).toHaveBeenCalledWith('토스트 테스트')
        })

        it('showToast가 false면 toast.error 호출 안 함', () => {
            vi.clearAllMocks()
            const error = new Error('토스트 없음')

            handleApiError(error, '기본 메시지', false)

            expect(toast.error).not.toHaveBeenCalled()
        })

        it('console.error 항상 호출', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
            const error = new Error('로깅 테스트')

            handleApiError(error, '기본 메시지', false)

            expect(consoleSpy).toHaveBeenCalled()
            consoleSpy.mockRestore()
        })
    })

    describe('formatZodErrors', () => {
        it('Zod 에러를 읽기 쉬운 문자열로 포맷', () => {
            const errors = {
                title: ['제목을 입력해주세요'],
                content: ['내용은 필수입니다'],
            }

            const result = formatZodErrors(errors)

            expect(result).toContain('title: 제목을 입력해주세요')
            expect(result).toContain('content: 내용은 필수입니다')
        })

        it('빈 에러는 기본 메시지 반환', () => {
            const result = formatZodErrors({})

            expect(result).toBe('유효하지 않은 입력입니다')
        })

        it('undefined 값은 무시', () => {
            const errors = {
                title: ['에러'],
                content: undefined,
            }

            const result = formatZodErrors(errors)

            expect(result).toBe('title: 에러')
        })

        it('빈 배열은 무시', () => {
            const errors = {
                title: [],
                content: ['에러'],
            }

            const result = formatZodErrors(errors)

            expect(result).toBe('content: 에러')
        })
    })

    describe('isNetworkError', () => {
        it('fetch 에러를 네트워크 에러로 인식', () => {
            const error = new Error('fetch failed')

            expect(isNetworkError(error)).toBe(true)
        })

        it('network 키워드 포함 시 네트워크 에러로 인식', () => {
            const error = new Error('network issue occurred')

            expect(isNetworkError(error)).toBe(true)
        })

        it('timeout 키워드 포함 시 네트워크 에러로 인식', () => {
            const error = new Error('request timeout')

            expect(isNetworkError(error)).toBe(true)
        })

        it('일반 에러는 네트워크 에러로 인식 안 함', () => {
            const error = new Error('validation error')

            expect(isNetworkError(error)).toBe(false)
        })

        it('Error 객체가 아니면 false 반환', () => {
            expect(isNetworkError('string error')).toBe(false)
            expect(isNetworkError(null)).toBe(false)
            expect(isNetworkError(undefined)).toBe(false)
        })
    })

    describe('safeJsonParse', () => {
        it('유효한 JSON 문자열을 파싱', () => {
            const json = '{"name": "test", "value": 123}'

            const result = safeJsonParse(json, {})

            expect(result).toEqual({ name: 'test', value: 123 })
        })

        it('유효하지 않은 JSON은 fallback 반환', () => {
            const invalidJson = '{invalid json}'
            const fallback = { error: true }

            const result = safeJsonParse(invalidJson, fallback)

            expect(result).toEqual(fallback)
        })

        it('빈 문자열은 fallback 반환', () => {
            const fallback = null

            const result = safeJsonParse('', fallback)

            expect(result).toEqual(fallback)
        })

        it('배열 파싱', () => {
            const json = '[1, 2, 3]'

            const result = safeJsonParse(json, [])

            expect(result).toEqual([1, 2, 3])
        })

        it('파싱 실패 시 console.warn 호출', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
            const invalidJson = 'not json'

            safeJsonParse(invalidJson, {})

            expect(consoleSpy).toHaveBeenCalled()
            consoleSpy.mockRestore()
        })

        it('긴 JSON 문자열은 100자까지만 로깅', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
            const longJson = 'x'.repeat(200)

            safeJsonParse(longJson, {})

            const loggedString = consoleSpy.mock.calls[0][1]
            expect(loggedString.length).toBe(100)
            consoleSpy.mockRestore()
        })
    })
})
