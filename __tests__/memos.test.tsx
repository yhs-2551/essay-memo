import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoClientPage } from '@/components/memo-list-client'
import { Memo } from '@/lib/types'

// Mock dependencies
vi.mock('@/components/background', () => ({
    Background: ({ children }: { children: React.ReactNode }) => <div data-testid="background">{children}</div>,
}))

vi.mock('next/link', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('next-themes', () => ({
    useTheme: () => ({ theme: 'dark' }),
}))

vi.mock('@/components/memo-editor', () => ({
    MemoEditor: () => <div data-testid="memo-editor">Memo Editor Placeholder</div>,
}))

// Mock hooks
const mockUseInfiniteList = vi.fn()
vi.mock('@/hooks/use-infinite-list', () => ({
    useInfiniteList: () => mockUseInfiniteList(),
}))

const mockUseSelection = vi.fn()
vi.mock('@/hooks/use-selection', () => ({
    useSelection: () => mockUseSelection(),
}))

describe('MemoClientPage Integration', () => {
    const defaultInfiniteListReturn = {
        items: [],
        setItems: vi.fn(),
        fetching: false,
        loadingMore: false,
        searchQuery: '',
        setSearchQuery: vi.fn(),
        hasMore: false,
        error: null,
        dateFilter: '',
        setDateFilter: vi.fn(),
        observerTarget: { current: null },
        refreshItems: vi.fn(),
    }

    const defaultSelectionReturn = {
        selectedIds: new Set(),
        toggleSelect: vi.fn(),
        selectAll: vi.fn(),
        clearSelection: vi.fn(),
        isSelected: vi.fn(() => false),
    }

    beforeEach(() => {
        vi.clearAllMocks()
        mockUseInfiniteList.mockReturnValue(defaultInfiniteListReturn)
        mockUseSelection.mockReturnValue(defaultSelectionReturn)
    })

    it('renders empty state when there are no memos', () => {
        render(<MemoClientPage initialMemos={[]} />)

        expect(screen.getByText('기억된 순간이 없습니다')).toBeDefined()
        expect(screen.getByText('지금 머릿속에 떠오르는 영감을 붙잡아두세요.')).toBeDefined()
    })

    it('renders memos when data is present', () => {
        const mockMemos: Memo[] = [
            {
                id: '1',
                content: 'First Memo',
                created_at: new Date().toISOString(),
                user_id: 'user-1',
                updated_at: new Date().toISOString(),
            },
            {
                id: '2',
                content: 'Second Memo',
                created_at: new Date().toISOString(),
                user_id: 'user-1',
                updated_at: new Date().toISOString(),
            },
        ]

        mockUseInfiniteList.mockReturnValue({
            ...defaultInfiniteListReturn,
            items: mockMemos,
        })

        render(<MemoClientPage initialMemos={mockMemos} />)

        expect(screen.getByText('First Memo')).toBeDefined()
        expect(screen.getByText('Second Memo')).toBeDefined()
        expect(screen.queryByText('기억된 순간이 없습니다')).toBeNull()
    })

    it('renders selection checkboxes when selection is active', () => {
        const mockMemos: Memo[] = [
            {
                id: '1',
                content: 'Selectable Memo',
                created_at: new Date().toISOString(),
                user_id: 'user-1',
                updated_at: new Date().toISOString(),
            },
        ]

        mockUseInfiniteList.mockReturnValue({
            ...defaultInfiniteListReturn,
            items: mockMemos,
        })

        mockUseSelection.mockReturnValue({
            ...defaultSelectionReturn,
            selectedIds: new Set(['1']),
        })

        render(<MemoClientPage initialMemos={mockMemos} />)

        // Checkbox should be present (shadcn checkbox usually has role checkbox)
        const checkbox = screen.getByRole('checkbox')
        expect(checkbox).toBeDefined()
    })
})
