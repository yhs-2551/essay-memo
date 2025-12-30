import { describe, it, expect } from 'vitest'
import { groupItemsByDate, getAvailableDates } from '@/lib/date-utils'
import type { DateGroup } from '@/lib/date-utils'

describe('date-utils', () => {
    describe('groupItemsByDate', () => {
        it('오늘 작성된 항목을 "오늘" 그룹으로 분류', () => {
            const todayItem = {
                id: '1',
                created_at: new Date().toISOString(),
            }

            const result = groupItemsByDate([todayItem])

            expect(result).toHaveLength(1)
            expect(result[0].label).toBe('오늘')
            expect(result[0].items).toHaveLength(1)
            expect(result[0].items[0].id).toBe('1')
        })

        it('어제 작성된 항목을 "어제" 그룹으로 분류', () => {
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)

            const yesterdayItem = {
                id: '2',
                created_at: yesterday.toISOString(),
            }

            const result = groupItemsByDate([yesterdayItem])

            expect(result).toHaveLength(1)
            expect(result[0].label).toBe('어제')
            expect(result[0].items).toHaveLength(1)
        })

        it('과거 날짜를 "YYYY년 M월" 형식으로 그룹화', () => {
            const pastDate = new Date('2024-03-15')
            const pastItem = {
                id: '3',
                created_at: pastDate.toISOString(),
            }

            const result = groupItemsByDate([pastItem])

            expect(result).toHaveLength(1)
            expect(result[0].label).toBe('2024년 3월')
            expect(result[0].date).toBe('2024-03')
        })

        it('여러 날짜의 항목을 올바른 순서로 그룹화', () => {
            const today = new Date()
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const lastMonth = new Date()
            lastMonth.setMonth(lastMonth.getMonth() - 1)

            const items = [
                { id: '1', created_at: today.toISOString() },
                { id: '2', created_at: yesterday.toISOString() },
                { id: '3', created_at: lastMonth.toISOString() },
                { id: '4', created_at: today.toISOString() },
            ]

            const result = groupItemsByDate(items)

            // 오늘, 어제, 지난 달 - 최소 3그룹
            expect(result.length).toBeGreaterThanOrEqual(3)
            expect(result[0].label).toBe('오늘')
            expect(result[0].items).toHaveLength(2) // 오늘 항목 2개
            expect(result[1].label).toBe('어제')
        })

        it('빈 배열 처리', () => {
            const result = groupItemsByDate([])
            expect(result).toEqual([])
        })

        it('같은 월의 여러 항목을 하나의 그룹으로 통합', () => {
            const items = [
                { id: '1', created_at: '2023-03-01T10:00:00Z' },
                { id: '2', created_at: '2023-03-15T15:00:00Z' },
                { id: '3', created_at: '2023-03-31T20:00:00Z' },
            ]

            const result = groupItemsByDate(items)

            expect(result).toHaveLength(1)
            expect(result[0].label).toBe('2023년 3월')
            expect(result[0].items).toHaveLength(3)
        })
    })

    describe('getAvailableDates', () => {
        it('항목에서 고유한 년/월 추출', () => {
            const items = [
                { id: '1', created_at: '2024-03-15T10:00:00Z' },
                { id: '2', created_at: '2024-03-20T15:00:00Z' },
                { id: '3', created_at: '2024-02-10T12:00:00Z' },
            ]

            const result = getAvailableDates(items)

            expect(result).toHaveLength(2)
            expect(result[0].value).toBe('2024-03')
            expect(result[0].label).toBe('2024년 3월')
            expect(result[1].value).toBe('2024-02')
            expect(result[1].label).toBe('2024년 2월')
        })

        it('최신 날짜부터 내림차순 정렬', () => {
            const items = [
                { id: '1', created_at: '2023-01-15T10:00:00Z' },
                { id: '2', created_at: '2024-12-20T15:00:00Z' },
                { id: '3', created_at: '2024-06-10T12:00:00Z' },
            ]

            const result = getAvailableDates(items)

            expect(result[0].value).toBe('2024-12') // 최신
            expect(result[1].value).toBe('2024-06')
            expect(result[2].value).toBe('2023-01') // 가장 오래됨
        })

        it('중복된 년/월 제거', () => {
            const items = [
                { id: '1', created_at: '2023-03-01T10:00:00Z' },
                { id: '2', created_at: '2023-03-15T15:00:00Z' },
                { id: '3', created_at: '2023-03-31T20:00:00Z' },
            ]

            const result = getAvailableDates(items)

            expect(result).toHaveLength(1)
            expect(result[0].value).toBe('2023-03')
        })

        it('빈 배열 처리', () => {
            const result = getAvailableDates([])
            expect(result).toEqual([])
        })
    })
})
