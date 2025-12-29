'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Background } from '@/components/background'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { SearchInput } from '@/components/ui/search-input'
import { SelectionBar } from '@/components/selection-bar'
import { FeatureDiscovery } from '@/components/feature-discovery'
import { Plus, ArrowLeft, BookOpen, Trash2, Sparkles, Loader2, Calendar, ChevronRight, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

import { groupItemsByDate, getAvailableDates } from '@/lib/date-utils'
import { useSelection } from '@/hooks/use-selection'
import { useInfiniteList } from '@/hooks/use-infinite-list'
import { MarkdownContent } from '@/components/markdown-content'
import { Post } from '@/lib/types'
import { PostListSkeleton } from '@/components/skeletons'
import { EmptyState } from '@/components/empty-state'

// Re-using local component for now (could be separated)
function BlogPostItem({
    post,
    onDelete,
    onEdit,
    selectionActive,
    onToggle,
    isSelected,
}: {
    post: Post
    onDelete: (id: string) => void
    onEdit: (post: Post) => void
    selectionActive: boolean
    onToggle: (id: string) => void
    isSelected: boolean
}) {
    const { theme } = useTheme()

    return (
        <div
            className={`group relative transition-all duration-300 ${isSelected ? 'scale-[0.98]' : 'hover:scale-[1.01]'}`}
            onContextMenu={(e) => {
                e.preventDefault()
                onToggle(post.id)
            }}
        >
            <Link href={`/blog/${post.id}`} className="block">
                <Card
                    className={`p-6 bg-background/40 backdrop-blur-md border border-white/20 dark:border-white/5 shadow-xl transition-all duration-500 hover:shadow-2xl hover:bg-background/60 ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                >
                    <div className="flex items-start gap-4">
                        <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-500 ${
                                post.mode === 'consultation'
                                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                            }`}
                        >
                            {post.mode === 'consultation' ? <Sparkles className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-bold truncate transition-colors">{post.title}</h3>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div
                                        role="button"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            onEdit(post)
                                        }}
                                        className="p-2 text-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 rounded-full transition-colors cursor-pointer"
                                        title="수정하기"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <div
                                        role="button"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            if (selectionActive) onToggle(post.id)
                                            else onDelete(post.id)
                                        }}
                                        className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-500/10 rounded-full transition-colors cursor-pointer"
                                        title="삭제하기"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>
                            <MarkdownContent
                                content={post.content}
                                className="text-muted-foreground line-clamp-2 text-sm mb-4 overflow-hidden"
                            />
                            <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                                <Calendar className="w-3 h-3" />
                                <span>{format(new Date(post.created_at), 'yyyy년 M월 d일', { locale: ko })}</span>
                                <span>·</span>
                                <span>{post.mode === 'consultation' ? '인사이트' : '기록'}</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </Link>
        </div>
    )
}

interface BlogClientPageProps {
    initialPosts: Post[]
}

export function BlogClientPage({ initialPosts }: BlogClientPageProps) {
    // ===== Infinite Scroll Hook =====
    const {
        items: posts,
        setItems: setPosts,
        fetching,
        loadingMore,
        searchQuery,
        setSearchQuery,
        hasMore,
        error,
        dateFilter,
        setDateFilter,
        observerTarget,
        refreshItems,
    } = useInfiniteList({ initialItems: initialPosts, fetchUrl: '/api/posts' })

    // ===== Component State =====
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
    const [isBulkDelete, setIsBulkDelete] = useState(false)
    const { theme } = useTheme()
    const router = useRouter()

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useSelection(posts)

    const handleEdit = (post: Post) => {
        router.replace(`/blog/edit/${post.id}`)
    }

    const handleDelete = (postId: string) => {
        setDeleteTargetId(postId)
    }

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return
        setIsBulkDelete(true)
    }

    // ===== Helper Functions (Clean Code: SRP) =====

    const executeSingleDelete = async (id: string) => {
        const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Delete failed')
        setPosts((prev) => prev.filter((p) => p.id !== id))
    }

    const executeBulkDelete = async (ids: string[]) => {
        const res = await fetch('/api/posts/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
        })
        if (!res.ok) throw new Error('Bulk delete failed')
        setPosts((prev) => prev.filter((p) => !ids.includes(p.id)))
        clearSelection()
    }

    // ===== Main Delete Handler (Orchestrator with Early Return) =====

    const executeDelete = async () => {
        // Guard: No target
        if (!isBulkDelete && !deleteTargetId) return

        try {
            if (isBulkDelete) {
                const ids = Array.from(selectedIds)
                await executeBulkDelete(ids)
                toast.success(`${ids.length}개 항목이 삭제되었습니다.`)
                return
            }

            await executeSingleDelete(deleteTargetId!)
            toast.success('글이 삭제되었습니다.')
        } catch (error) {
            console.error(error)
            toast.error('삭제 중 오류가 발생했습니다.')
        } finally {
            setDeleteTargetId(null)
            setIsBulkDelete(false)
        }
    }

    const filteredByDate = useMemo(() => {
        if (!dateFilter) return posts
        return posts.filter((p) => format(new Date(p.created_at), 'yyyy-MM') === dateFilter)
    }, [posts, dateFilter])

    const groups = useMemo(() => groupItemsByDate(filteredByDate), [filteredByDate])
    const dateOptions = useMemo(() => getAvailableDates(posts), [posts])

    return (
        <div className="min-h-screen p-6 pt-24 relative">
            <Background />

            {/* Header and List Content */}
            <div className="max-w-4xl mx-auto space-y-6">
                <header className="flex flex-col gap-8">
                    <div className="flex items-center justify-between">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/20">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <h1 className="text-2xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-500/80 via-purple-500/70 to-pink-500/60 dark:from-indigo-400/90 dark:via-purple-400/80 dark:to-pink-400/70 tracking-tight">
                            에세이 (Essay)
                        </h1>
                        <Link href="/blog/new">
                            <Button
                                variant={mounted ? (theme === 'dark' ? 'cosmic' : 'cute') : 'default'}
                                size="default"
                                className="rounded-2xl shadow-xl shadow-primary/10 transition-all hover:scale-105 md:h-11 md:px-8"
                            >
                                <Plus className="mr-2 h-5 w-5" /> 새 에세이
                            </Button>
                        </Link>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex-1 relative">
                            <SearchInput onSearch={setSearchQuery} />
                        </div>

                        <div className="relative min-w-[140px]">
                            <select
                                className="w-full h-11 pl-10 pr-8 appearance-none rounded-xl bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-800 dark:to-indigo-950/30 border-2 border-indigo-200/50 dark:border-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/50 dark:focus:ring-indigo-500/20 outline-none cursor-pointer text-sm font-semibold text-indigo-900 dark:text-indigo-100 transition-all shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-400"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                aria-label="날짜 필터"
                            >
                                <option value="" className="bg-white dark:bg-slate-800 text-foreground">
                                    전체 기간
                                </option>
                                {dateOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-800 text-foreground">
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-600 dark:text-indigo-400 pointer-events-none" />
                        </div>
                    </div>
                </header>

                <div className="space-y-4 pb-32">
                    {fetching && posts.length === 0 ? (
                        <PostListSkeleton count={3} />
                    ) : (
                        <>
                            {groups.map((group) => (
                                <div key={group.date} className="space-y-6 pt-4">
                                    <div className="sticky top-6 z-10 flex items-center gap-4 bg-background/5 backdrop-blur-sm p-2 rounded-2xl">
                                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary/60 pl-2">
                                            {group.label}
                                        </h2>
                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                                    </div>
                                    <div className="grid grid-cols-1 gap-6">
                                        {group.items.map((post) => (
                                            <BlogPostItem
                                                key={post.id}
                                                post={post}
                                                isSelected={isSelected(post.id)}
                                                selectionActive={selectedIds.size > 0}
                                                onToggle={toggleSelect}
                                                onDelete={handleDelete}
                                                onEdit={handleEdit}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <div ref={observerTarget} className="h-40 flex flex-col items-center justify-center gap-4">
                                {loadingMore && (
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
                                        <span className="text-xs font-medium text-muted-foreground/60">더 많은 내용을 불러오는 중...</span>
                                    </div>
                                )}

                                {error && (
                                    <div className="flex flex-col items-center animate-in fade-in">
                                        <p className="text-muted-foreground/70 mb-3 text-sm">잠시 연결이 끊어졌어요 💫</p>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={refreshItems}
                                            className="bg-primary/5 hover:bg-primary/10 text-primary rounded-full px-6"
                                        >
                                            <Loader2 className="w-3 h-3 mr-2" /> 다시 시도
                                        </Button>
                                    </div>
                                )}

                                {!hasMore && !error && groups.length > 0 && (
                                    <div className="flex flex-col items-center gap-4 opacity-40">
                                        <div className="w-20 h-px bg-gradient-to-r from-transparent via-muted-foreground/50 to-transparent" />
                                        <div className="text-xs font-medium text-muted-foreground/60">마지막 페이지입니다</div>
                                    </div>
                                )}
                                {groups.length === 0 && (
                                    <EmptyState
                                        icon={searchQuery || dateFilter ? Search : BookOpen}
                                        title={searchQuery || dateFilter ? '검색 결과가 없습니다' : '아직 기록된 이야기가 없습니다'}
                                        description={
                                            searchQuery || dateFilter
                                                ? '다른 키워드나 날짜로 다시 검색해보세요.'
                                                : '당신의 일상, 생각, 그리고 감정을 우주에 기록해보세요.'
                                        }
                                        actionLabel={!searchQuery && !dateFilter ? '첫 에세이 쓰기' : undefined}
                                        onAction={() => router.push('/blog/new')}
                                        className="py-20"
                                    />
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <SelectionBar
                selectedCount={selectedIds.size}
                totalCount={posts.length}
                onClear={clearSelection}
                onSelectAll={selectAll}
                onDelete={handleBulkDelete}
            />

            <FeatureDiscovery />

            <Dialog
                open={!!deleteTargetId || isBulkDelete}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteTargetId(null)
                        setIsBulkDelete(false)
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>기록 삭제</DialogTitle>
                        <DialogDescription>
                            {isBulkDelete
                                ? `선택한 ${selectedIds.size}개의 기록을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
                                : '정말 이 기록을 삭제하시겠습니까? 삭제된 기록은 복구할 수 없습니다.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setDeleteTargetId(null)
                                setIsBulkDelete(false)
                            }}
                        >
                            취소
                        </Button>
                        <Button variant="destructive" onClick={executeDelete}>
                            삭제
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
