import { describe, it, expect } from 'vitest'

// auth/callback 라우트의 핵심 보안 로직만 추출해서 테스트
// Open Redirect 방지: next 파라미터 검증 함수
function getSafeRedirectPath(next: string | null): string {
    const DEFAULT_PATH = '/'
    if (!next) return DEFAULT_PATH
    const isInternalPath = next.startsWith('/') && !next.startsWith('//')
    return isInternalPath ? next : DEFAULT_PATH
}

describe('Auth Callback - Open Redirect 방지', () => {
    describe('정상 케이스: 내부 경로는 허용', () => {
        it('일반 내부 경로를 그대로 반환해야 한다', () => {
            expect(getSafeRedirectPath('/memos')).toBe('/memos')
            expect(getSafeRedirectPath('/blog')).toBe('/blog')
            expect(getSafeRedirectPath('/blog/new')).toBe('/blog/new')
        })

        it('루트 경로(/)를 그대로 반환해야 한다', () => {
            expect(getSafeRedirectPath('/')).toBe('/')
        })

        it('쿼리 파라미터가 있는 내부 경로도 허용해야 한다', () => {
            expect(getSafeRedirectPath('/memos?q=test')).toBe('/memos?q=test')
        })
    })

    describe('공격 케이스: 외부 URL은 모두 차단', () => {
        it('http:// 외부 URL을 차단하고 홈으로 리다이렉트해야 한다', () => {
            expect(getSafeRedirectPath('http://evil.com')).toBe('/')
            expect(getSafeRedirectPath('http://evil.com/steal')).toBe('/')
        })

        it('https:// 외부 URL을 차단하고 홈으로 리다이렉트해야 한다', () => {
            expect(getSafeRedirectPath('https://evil.com')).toBe('/')
            expect(getSafeRedirectPath('https://phishing.site/login')).toBe('/')
        })

        it('프로토콜 상대 URL(//)을 차단해야 한다', () => {
            // //evil.com 은 브라우저가 현재 프로토콜로 외부 사이트로 이동시킴
            expect(getSafeRedirectPath('//evil.com')).toBe('/')
            expect(getSafeRedirectPath('//evil.com/steal')).toBe('/')
        })

        it('null이나 빈 값이면 홈으로 리다이렉트해야 한다', () => {
            expect(getSafeRedirectPath(null)).toBe('/')
            expect(getSafeRedirectPath('')).toBe('/')
        })

        it('javascript: 프로토콜을 차단해야 한다 (XSS 방지)', () => {
            expect(getSafeRedirectPath('javascript:alert(1)')).toBe('/')
        })

        it('data: 프로토콜을 차단해야 한다', () => {
            expect(getSafeRedirectPath('data:text/html,<script>alert(1)</script>')).toBe('/')
        })
    })
})
