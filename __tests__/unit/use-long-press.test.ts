import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLongPress } from '@/hooks/use-long-press'

describe('useLongPress', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('반환된 이벤트 핸들러들이 올바른 형태여야 한다', () => {
        const callback = vi.fn()
        const { result } = renderHook(() => useLongPress(callback))

        expect(result.current.onMouseDown).toBeTypeOf('function')
        expect(result.current.onMouseUp).toBeTypeOf('function')
        expect(result.current.onMouseLeave).toBeTypeOf('function')
        expect(result.current.onTouchStart).toBeTypeOf('function')
        expect(result.current.onTouchEnd).toBeTypeOf('function')
        expect(result.current.onContextMenu).toBeTypeOf('function')
    })

    it('길게 누르면 지정된 시간 후 콜백이 호출되어야 한다', () => {
        const callback = vi.fn()
        const { result } = renderHook(() => useLongPress(callback, 500))

        act(() => result.current.onMouseDown())
        expect(callback).not.toHaveBeenCalled()

        act(() => vi.advanceTimersByTime(500))
        expect(callback).toHaveBeenCalledTimes(1)
    })

    it('시간이 지나기 전에 놓으면 콜백이 호출되지 않아야 한다', () => {
        const callback = vi.fn()
        const { result } = renderHook(() => useLongPress(callback, 500))

        act(() => result.current.onMouseDown())
        act(() => vi.advanceTimersByTime(300))
        act(() => result.current.onMouseUp())
        act(() => vi.advanceTimersByTime(300))

        expect(callback).not.toHaveBeenCalled()
    })

    it('onContextMenu가 콜백을 즉시 호출해야 한다', () => {
        const callback = vi.fn()
        const { result } = renderHook(() => useLongPress(callback))

        const mockEvent = { preventDefault: vi.fn() } as unknown as React.MouseEvent
        act(() => result.current.onContextMenu(mockEvent))

        expect(callback).toHaveBeenCalledTimes(1)
        expect(mockEvent.preventDefault).toHaveBeenCalled()
    })

    it('마우스가 떠나면(onMouseLeave) 타이머가 취소되어야 한다', () => {
        const callback = vi.fn()
        const { result } = renderHook(() => useLongPress(callback, 500))

        act(() => result.current.onMouseDown())
        act(() => vi.advanceTimersByTime(300))
        act(() => result.current.onMouseLeave())
        act(() => vi.advanceTimersByTime(300))

        expect(callback).not.toHaveBeenCalled()
    })
})
