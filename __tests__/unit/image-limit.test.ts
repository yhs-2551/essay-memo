import { describe, it, expect, vi } from 'vitest'

/**
 * applyImageLimit 함수를 Edge Function에서 추출하여 테스트
 * 실제 프로덕션 코드는 Edge Function 내부에 있지만,
 * 순수 함수이므로 로직만 추출해서 테스트
 */
const applyImageLimit = (images: string[], limit: number): string[] => {
    const hasExceededLimit = images.length > limit
    if (hasExceededLimit) {
        console.log(`[System] Image limit applied: ${images.length} -> ${limit}`)
    }
    return images.slice(0, limit)
}

describe('applyImageLimit', () => {
    it('경계값: 이미지 0개는 빈 배열 반환', () => {
        const result = applyImageLimit([], 5)

        expect(result).toEqual([])
        expect(result).toHaveLength(0)
    })

    it('경계값: 이미지 5개 정확히는 모두 반환', () => {
        const images = ['img1', 'img2', 'img3', 'img4', 'img5']

        const result = applyImageLimit(images, 5)

        expect(result).toHaveLength(5)
        expect(result).toEqual(images)
    })

    it('경계값: 이미지 10개는 앞 5개만 반환', () => {
        const images = Array.from({ length: 10 }, (_, i) => `img${i + 1}`)

        const result = applyImageLimit(images, 5)

        expect(result).toHaveLength(5)
        expect(result).toEqual(['img1', 'img2', 'img3', 'img4', 'img5'])
    })

    it('이미지 3개는 모두 반환 (제한 미만)', () => {
        const images = ['img1', 'img2', 'img3']

        const result = applyImageLimit(images, 5)

        expect(result).toHaveLength(3)
        expect(result).toEqual(images)
    })

    it('이미지 7개는 앞 5개만 반환', () => {
        const images = ['a', 'b', 'c', 'd', 'e', 'f', 'g']

        const result = applyImageLimit(images, 5)

        expect(result).toHaveLength(5)
        expect(result[0]).toBe('a')
        expect(result[4]).toBe('e')
    })

    it('제한 초과 시 console.log 호출', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        const images = Array.from({ length: 10 }, (_, i) => `img${i}`)

        applyImageLimit(images, 5)

        expect(consoleSpy).toHaveBeenCalledWith('[System] Image limit applied: 10 -> 5')
        consoleSpy.mockRestore()
    })

    it('제한 이하는 console.log 호출 안 함', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        const images = ['img1', 'img2']

        applyImageLimit(images, 5)

        expect(consoleSpy).not.toHaveBeenCalled()
        consoleSpy.mockRestore()
    })

    it('limit 값이 0이면 빈 배열 반환', () => {
        const images = ['img1', 'img2', 'img3']

        const result = applyImageLimit(images, 0)

        expect(result).toEqual([])
    })

    it('원본 배열은 변경되지 않음 (불변성)', () => {
        const images = ['img1', 'img2', 'img3', 'img4', 'img5', 'img6']
        const original = [...images]

        applyImageLimit(images, 3)

        expect(images).toEqual(original)
    })

    it('매우 큰 배열도 정확히 제한', () => {
        const images = Array.from({ length: 1000 }, (_, i) => `img${i}`)

        const result = applyImageLimit(images, 5)

        expect(result).toHaveLength(5)
    })
})
