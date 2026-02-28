import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSelection } from '@/hooks/use-selection'

const MOCK_ITEMS = [
    { id: 'item-1', name: 'First' },
    { id: 'item-2', name: 'Second' },
    { id: 'item-3', name: 'Third' },
]

describe('useSelection', () => {
    it('초기 상태에서 선택된 항목이 없어야 한다', () => {
        const { result } = renderHook(() => useSelection(MOCK_ITEMS))

        expect(result.current.selectedIds.size).toBe(0)
        expect(result.current.isSelected('item-1')).toBe(false)
    })

    it('toggleSelect로 항목을 선택/해제할 수 있어야 한다', () => {
        const { result } = renderHook(() => useSelection(MOCK_ITEMS))

        act(() => result.current.toggleSelect('item-1'))
        expect(result.current.isSelected('item-1')).toBe(true)
        expect(result.current.selectedIds.size).toBe(1)

        act(() => result.current.toggleSelect('item-1'))
        expect(result.current.isSelected('item-1')).toBe(false)
        expect(result.current.selectedIds.size).toBe(0)
    })

    it('여러 항목을 동시에 선택할 수 있어야 한다', () => {
        const { result } = renderHook(() => useSelection(MOCK_ITEMS))

        act(() => result.current.toggleSelect('item-1'))
        act(() => result.current.toggleSelect('item-3'))

        expect(result.current.isSelected('item-1')).toBe(true)
        expect(result.current.isSelected('item-2')).toBe(false)
        expect(result.current.isSelected('item-3')).toBe(true)
        expect(result.current.selectedIds.size).toBe(2)
    })

    it('selectAll로 전체 선택/해제를 토글할 수 있어야 한다', () => {
        const { result } = renderHook(() => useSelection(MOCK_ITEMS))

        act(() => result.current.selectAll())
        expect(result.current.selectedIds.size).toBe(3)
        expect(result.current.isSelected('item-1')).toBe(true)
        expect(result.current.isSelected('item-2')).toBe(true)
        expect(result.current.isSelected('item-3')).toBe(true)

        act(() => result.current.selectAll())
        expect(result.current.selectedIds.size).toBe(0)
    })

    it('clearSelection으로 선택을 초기화할 수 있어야 한다', () => {
        const { result } = renderHook(() => useSelection(MOCK_ITEMS))

        act(() => result.current.toggleSelect('item-1'))
        act(() => result.current.toggleSelect('item-2'))
        expect(result.current.selectedIds.size).toBe(2)

        act(() => result.current.clearSelection())
        expect(result.current.selectedIds.size).toBe(0)
    })

    it('빈 배열에서도 정상 동작해야 한다', () => {
        const { result } = renderHook(() => useSelection([]))

        expect(result.current.selectedIds.size).toBe(0)

        act(() => result.current.selectAll())
        expect(result.current.selectedIds.size).toBe(0)
    })
})
