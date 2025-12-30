import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('utils', () => {
    describe('cn (className merging)', () => {
        it('단일 클래스네임 반환', () => {
            expect(cn('text-white')).toBe('text-white')
        })

        it('여러 클래스네임 병합', () => {
            expect(cn('bg-blue-500', 'text-white')).toBe('bg-blue-500 text-white')
        })

        it('Tailwind 충돌 클래스 자동 해결 (뒷것 우선)', () => {
            // bg-blue-500 vs bg-red-500 충돌 시 뒷것이 우선
            const result = cn('bg-blue-500', 'bg-red-500')
            expect(result).toBe('bg-red-500')
        })

        it('조건부 클래스 처리', () => {
            const isActive = true
            const result = cn('base-class', isActive && 'active-class')
            expect(result).toBe('base-class active-class')
        })

        it('false, null, undefined 무시', () => {
            const result = cn('valid', false, null, undefined, 'class')
            expect(result).toBe('valid class')
        })

        it('객체 형태 조건부 클래스', () => {
            const result = cn({
                'class-1': true,
                'class-2': false,
                'class-3': true,
            })
            expect(result).toContain('class-1')
            expect(result).toContain('class-3')
            expect(result).not.toContain('class-2')
        })

        it('빈 입력 처리', () => {
            expect(cn()).toBe('')
            expect(cn('')).toBe('')
        })

        it('복잡한 Tailwind 충돌 해결', () => {
            const result = cn('px-2 py-1 px-4') // px-2 vs px-4 충돌
            expect(result).toBe('py-1 px-4')
        })
    })
})
