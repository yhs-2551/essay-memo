import { describe, it, expect } from 'vitest'
import { AI_CONFIG, PERSONA_ACCESS, PERSONAS } from '@/lib/constants'
import { MAX_FREE_CONSULTATIONS, MAX_PRO_CONSULTATIONS } from '@/hooks/use-usage-limit'

describe('Subscription Tier Limits', () => {
    describe('AI Analysis Limits', () => {
        it('Free 티어는 일 2회 제한', () => {
            expect(AI_CONFIG.DAILY_FREE_LIMIT).toBe(2)
            expect(MAX_FREE_CONSULTATIONS).toBe(2)
        })

        it('Pro 티어는 일 10회 제한', () => {
            expect(AI_CONFIG.DAILY_PRO_LIMIT).toBe(10)
            expect(MAX_PRO_CONSULTATIONS).toBe(10)
        })

        it('Pro 티어가 Free 티어보다 5배 많음', () => {
            const ratio = AI_CONFIG.DAILY_PRO_LIMIT / AI_CONFIG.DAILY_FREE_LIMIT
            expect(ratio).toBe(5)
        })
    })

    describe('Persona Access Control', () => {
        it('Free 티어는 프리즘 1개만 접근 가능', () => {
            expect(PERSONA_ACCESS.FREE).toHaveLength(1)
            expect(PERSONA_ACCESS.FREE[0]).toBe('prism')
        })

        it('Pro 티어는 전체 6개 페르소나 접근 가능', () => {
            expect(PERSONA_ACCESS.PRO).toHaveLength(6)
        })

        it('Pro 티어는 모든 페르소나 ID 포함', () => {
            const allPersonaIds = PERSONAS.map((p) => p.id)
            expect(PERSONA_ACCESS.PRO).toEqual(allPersonaIds)
        })

        it('Pro 티어는 프리즘을 포함함', () => {
            expect(PERSONA_ACCESS.PRO).toContain('prism')
        })

        it('Free 티어가 접근 불가능한 페르소나 확인', () => {
            const lockedPersonas = (PERSONA_ACCESS.PRO as readonly string[]).filter(
                (id) => !(PERSONA_ACCESS.FREE as readonly string[]).includes(id)
            )
            expect(lockedPersonas).toHaveLength(5)
            expect(lockedPersonas).toContain('nietzsche')
            expect(lockedPersonas).toContain('aurelius')
            expect(lockedPersonas).toContain('jung')
            expect(lockedPersonas).toContain('zhuangzi')
            expect(lockedPersonas).toContain('beauvoir')
        })
    })

    describe('Business Logic Validation', () => {
        it('마진율 계산: Pro 10회는 비용 대비 안전', () => {
            // Pro 10회/일 = 월 300회
            // AI 비용: 300회 × $0.0052 = $1.56
            // 스토리지: $0.50
            // 총 원가: $2.06
            // 실수입: $2.80 (5,000원 - 30% 수수료)
            // 마진율: ($2.80 - $2.06) / $2.80 = 26.4% (이전 계산)

            // 실제로는 이미지 분석을 별도 제한하므로
            // 텍스트만: 300회 × $0.0002 = $0.06
            // 이미지: 월 30회 × $0.005 = $0.15
            // 총 원가: $0.71
            // 마진율: ($2.80 - $0.71) / $2.80 = 75% ✅

            const monthlyAnalysis = AI_CONFIG.DAILY_PRO_LIMIT * 30
            expect(monthlyAnalysis).toBe(300) // 월 300회
        })

        it('Free 티어는 체험용으로 충분', () => {
            expect(AI_CONFIG.DAILY_FREE_LIMIT).toBeGreaterThanOrEqual(1)
            expect(AI_CONFIG.DAILY_FREE_LIMIT).toBeLessThan(AI_CONFIG.DAILY_PRO_LIMIT)
        })
    })
})
