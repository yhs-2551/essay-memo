import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BlogClientPage } from '@/components/blog-list-client'
import { Post } from '@/lib/types'

// Mock dependencies
vi.mock('@/components/background', () => ({
    Background: () => <div data-testid="background" />,
}))

vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href} data-testid="next-link">
            {children}
        </a>
    ),
}))

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        replace: vi.fn(),
        push: vi.fn(),
    }),
}))

vi.mock('next-themes', () => ({
    useTheme: () => ({ theme: 'dark' }),
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

describe('BlogClientPage (Essay List) Integration', () => {
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

    it('renders empty state when there are no posts', () => {
        render(<BlogClientPage initialPosts={[]} />)

        expect(screen.getByText('아직 기록된 이야기가 없습니다')).toBeDefined()
        expect(screen.getByText('당신의 일상, 생각, 그리고 감정을 우주에 기록해보세요.')).toBeDefined()
    })

    it('renders posts when data is present', () => {
        const mockPosts: Post[] = [
            {
                id: '1',
                title: 'First Essay',
                content: 'Content of the first essay',
                mode: 'standard',
                created_at: new Date().toISOString(),
                user_id: 'user-1',
                updated_at: new Date().toISOString(),
                is_published: true,
                images: [],
            },
            {
                id: '2',
                title: 'Second Essay',
                content: 'Content of the second essay',
                mode: 'consultation',
                created_at: new Date().toISOString(),
                user_id: 'user-1',
                updated_at: new Date().toISOString(),
                is_published: true,
                images: [],
            },
        ]

        mockUseInfiniteList.mockReturnValue({
            ...defaultInfiniteListReturn,
            items: mockPosts,
        })

        render(<BlogClientPage initialPosts={mockPosts} />)

        expect(screen.getByText('First Essay')).toBeDefined()
        expect(screen.getByText('Second Essay')).toBeDefined()
        expect(screen.queryByText('아직 기록된 이야기가 없습니다')).toBeNull()
    })

    it('renders "새 에세이" button for creating new posts', () => {
        render(<BlogClientPage initialPosts={[]} />)

        expect(screen.getByText('새 에세이')).toBeDefined()
    })

    it('displays mode indicator for consultation posts', () => {
        const consultationPost: Post[] = [
            {
                id: '1',
                title: 'Insight Post',
                content: 'AI analyzed content',
                mode: 'consultation',
                created_at: new Date().toISOString(),
                user_id: 'user-1',
                updated_at: new Date().toISOString(),
                is_published: true,
                images: [],
            },
        ]

        mockUseInfiniteList.mockReturnValue({
            ...defaultInfiniteListReturn,
            items: consultationPost,
        })

        render(<BlogClientPage initialPosts={consultationPost} />)

        // Mode indicator should be present (인사이트 for consultation mode)
        expect(screen.getByText('인사이트')).toBeDefined()
    })
})
