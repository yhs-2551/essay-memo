/**
 * Error Handler - 통합 에러 처리 유틸리티
 *
 * 일관된 에러 핸들링으로 UX 및 디버깅 개선
 */

import { toast } from 'sonner'

interface ApiError {
    message: string
    code?: string
    details?: unknown
}

/**
 * API 에러 핸들러
 * @param error - 발생한 에러
 * @param fallbackMessage - 기본 에러 메시지
 * @param showToast - 토스트 표시 여부
 */
export const handleApiError = (error: unknown, fallbackMessage = '오류가 발생했습니다', showToast = true): ApiError => {
    let errorInfo: ApiError = { message: fallbackMessage }

    if (error instanceof Error) {
        errorInfo = { message: error.message }
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorInfo = error as ApiError
    }

    console.error('[API Error]', errorInfo)

    if (showToast) {
        toast.error(errorInfo.message)
    }

    return errorInfo
}

/**
 * Zod 검증 에러 포맷터
 * @param errors - Zod 에러 객체
 */
export const formatZodErrors = (errors: Record<string, string[] | undefined>): string => {
    const messages = Object.entries(errors)
        .filter(([, v]) => v && v.length > 0)
        .map(([k, v]) => `${k}: ${v?.[0]}`)

    return messages.join(', ') || '유효하지 않은 입력입니다'
}

/**
 * 네트워크 에러 체크
 * @param error - 에러 객체
 */
export const isNetworkError = (error: unknown): boolean => {
    if (error instanceof Error) {
        return error.message.includes('fetch') || error.message.includes('network') || error.message.includes('timeout')
    }
    return false
}

/**
 * 안전한 JSON 파싱
 * @param json - JSON 문자열
 * @param fallback - 파싱 실패 시 기본값
 */
export const safeJsonParse = <T>(json: string, fallback: T): T => {
    try {
        return JSON.parse(json) as T
    } catch {
        console.warn('[JSON Parse Error]', json.slice(0, 100))
        return fallback
    }
}
