"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Background } from "@/components/background";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { StickyHeader } from "@/components/ui/sticky-header";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Trash2, ArrowLeft, Loader2, Calendar, Sparkles, BookOpen } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { groupItemsByDate, getAvailableDates, DateGroup } from "@/lib/date-utils";
import { MemoEditor } from "@/components/memo-editor";
import { Checkbox } from "@/components/ui/checkbox";
import { MarkdownContent } from "@/components/markdown-content";
import { useSelection } from "@/hooks/use-selection";
import { SelectionBar } from "@/components/selection-bar";
import { useLongPress } from "@/hooks/use-long-press";
import { FeatureDiscovery } from "@/components/feature-discovery";

type Memo = {
    id: string;
    content: string;
    created_at: string;
};

interface MemoItemProps {
    memo: Memo;
    isSelected: boolean;
    selectionActive: boolean;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onSave: (id: string, content: string) => Promise<void>;
}

function MemoItem({ memo, isSelected, selectionActive, onToggle, onDelete, onSave }: MemoItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const longPress = useLongPress(() => onToggle(memo.id));

    if (isEditing) {
        return (
            <MemoEditor
                initialContent={memo.content}
                onSave={async (content) => {
                    await onSave(memo.id, content);
                    setIsEditing(false);
                }}
                onCancel={() => setIsEditing(false)}
                autoFocus
            />
        );
    }

    return (
        <div className='relative group' {...longPress}>
            <Card
                onClick={() => {
                    if (selectionActive) onToggle(memo.id);
                    else setIsEditing(true);
                }}
                className={`p-6 relative bg-background/40 backdrop-blur-md border border-white/20 dark:border-white/5 transition-all duration-500 cursor-pointer shadow-xl hover:shadow-2xl hover:bg-background/60 ${
                    isSelected ? "ring-2 ring-blue-500/50 bg-blue-500/5 shadow-inner scale-[0.99]" : "hover:scale-[1.01]"
                }`}
            >
                <div className='flex gap-4'>
                    {selectionActive && (
                        <div className='mt-1'>
                            <Checkbox checked={isSelected} onCheckedChange={() => onToggle(memo.id)} />
                        </div>
                    )}

                    <div className='flex items-start gap-4 flex-1'>
                        <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-500
                                    bg-blue-500/10 text-blue-600 dark:text-blue-400`}
                        >
                            <BookOpen className='w-6 h-6' />
                        </div>

                        <div className='flex-1 min-w-0'>
                            <div className='flex items-center justify-between mb-2'>
                                <h3 className='text-sm font-bold text-muted-foreground/60 uppercase tracking-widest'>메모</h3>
                                <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                                    <div
                                        role='button'
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsEditing(true);
                                        }}
                                        className='p-2 text-blue-400 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 rounded-full transition-colors cursor-pointer'
                                        title='수정하기'
                                    >
                                        <Sparkles className='h-4 w-4' />
                                    </div>
                                    <div
                                        role='button'
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (selectionActive) onToggle(memo.id);
                                            else onDelete(memo.id);
                                        }}
                                        className='p-2 text-red-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-500/10 rounded-full transition-colors cursor-pointer'
                                        title='삭제하기'
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </div>
                                </div>
                            </div>

                            <MarkdownContent content={memo.content} className='text-base leading-relaxed mb-4' />

                            <div className='flex items-center gap-2 text-xs text-muted-foreground/70'>
                                <Calendar className='w-3 h-3' />
                                <span>{format(new Date(memo.created_at), "yyyy년 M월 d일", { locale: ko })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default function MemoPage() {
    const [memos, setMemos] = useState<Memo[]>([]);
    const [fetching, setFetching] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [dateFilter, setDateFilter] = useState<string>(""); // "YYYY-MM"
    const { theme } = useTheme();
    const observerTarget = useRef<HTMLDivElement>(null);

    const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useSelection(memos);

    useEffect(() => {
        setPage(1);
        setMemos([]);
        fetchMemos(1, searchQuery);
    }, [searchQuery]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !fetching && !loadingMore) {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchMemos(nextPage, searchQuery);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, fetching, loadingMore, page, searchQuery]);

    const fetchMemos = async (pageNum: number, query = "") => {
        if (pageNum === 1) setFetching(true);
        else setLoadingMore(true);

        try {
            const limit = 20;
            const res = await fetch(`/api/memos?q=${encodeURIComponent(query)}&page=${pageNum}&limit=${limit}`);
            const data = await res.json();

            if (data.memos) {
                if (pageNum === 1) {
                    setMemos(data.memos);
                } else {
                    setMemos((prev) => [...prev, ...data.memos]);
                }
                setHasMore(data.hasMore);
            }
        } catch (e) {
            console.error(e);
            toast.error("기억을 불러오는데 실패했습니다.");
        } finally {
            setFetching(false);
            setLoadingMore(false);
        }
    };

    // Optimize: Computation
    const filteredMemos = useMemo(() => {
        if (!dateFilter) return memos;
        return memos.filter((m) => m.created_at.startsWith(dateFilter));
    }, [memos, dateFilter]);

    const groups: DateGroup[] = useMemo(() => {
        return groupItemsByDate(filteredMemos);
    }, [filteredMemos]);

    const dateOptions = useMemo(() => getAvailableDates(memos), [memos]);

    const handleSave = async (content: string) => {
        try {
            const res = await fetch("/api/memos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });
            if (res.ok) {
                const newMemo = await res.json();
                setMemos([newMemo, ...memos]);
                toast.success("글이 작성되었습니다.");
            }
        } catch (e) {
            console.error(e);
            toast.error("저장 실패");
        }
    };

    const handleUpdate = async (id: string, content: string) => {
        try {
            const res = await fetch(`/api/memos/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });
            if (res.ok) {
                const updatedMemo = await res.json();
                setMemos(memos.map((m) => (m.id === id ? updatedMemo : m)));
                toast.success("기억이 수정되었습니다.");
            }
        } catch (e) {
            console.error(e);
            toast.error("수정 실패");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/memos/${id}`, { method: "DELETE" });
            if (res.ok) {
                setMemos(memos.filter((m) => m.id !== id));
                if (selectedIds.has(id)) toggleSelect(id);
                toast.success("단상이 삭제되었습니다.");
            }
        } catch (e) {
            console.error(e);
            toast.error("삭제 실패");
        }
    };

    const handleBulkDelete = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        try {
            const res = await fetch("/api/memos/bulk-delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids }),
            });
            if (res.ok) {
                setMemos(memos.filter((m) => !selectedIds.has(m.id)));
                clearSelection();
                toast.success(`${ids.length}개의 단상이 삭제되었습니다.`);
            }
        } catch (e) {
            console.error(e);
            toast.error("일괄 삭제 실패");
        }
    };

    return (
        <div className='min-h-screen p-6 relative'>
            <Background />
            <div className='max-w-md mx-auto space-y-6'>
                <header className='flex flex-col gap-4'>
                    <div className='flex items-center justify-between'>
                        <Link href='/'>
                            <Button variant='ghost' size='icon'>
                                <ArrowLeft className='h-6 w-6' />
                            </Button>
                        </Link>
                        <h1 className='text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500'>
                            단상 (Moment)
                        </h1>
                        <div className='w-10' />
                    </div>

                    <SearchInput onSearch={setSearchQuery} />

                    {/* Memo Date Filter - Compact */}
                    <div className='relative'>
                        <select
                            className='w-full h-11 pl-10 pr-8 appearance-none rounded-xl bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-800 dark:to-indigo-950/30 border-2 border-indigo-200/50 dark:border-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/50 dark:focus:ring-indigo-500/20 outline-none cursor-pointer text-sm font-semibold text-indigo-900 dark:text-indigo-100 transition-all shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-400'
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            aria-label='날짜 필터'
                        >
                            <option value='' className='bg-white dark:bg-slate-800 text-foreground'>
                                전체 기간
                            </option>
                            {dateOptions.map((opt) => (
                                <option key={opt.value} value={opt.value} className='bg-white dark:bg-slate-800 text-foreground'>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <Calendar className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-600 dark:text-indigo-400 pointer-events-none' />
                    </div>
                </header>

                <MemoEditor onSave={handleSave} placeholder='지금 머릿속에 맴도는 생각은 무엇인가요?' className='mb-8 shadow-blue-500/10' />

                <div className='space-y-4 pb-20'>
                    {fetching ? (
                        <div className='flex flex-col items-center justify-center py-20 gap-4 opacity-50'>
                            <Loader2 className='w-8 h-8 animate-spin text-primary' />
                            <div className='text-sm font-medium'>단상을 불러오는 중...</div>
                        </div>
                    ) : groups.length === 0 ? (
                        <div className='text-center text-muted-foreground py-20 bg-background/30 rounded-2xl border border-dashed border-border/50'>
                            <div className='mb-4 flex justify-center'>
                                <Calendar className='w-12 h-12 opacity-10' />
                            </div>
                            <p className='text-sm'>{searchQuery || dateFilter ? "검색된 기억이 없습니다." : "작성된 기억이 없습니다."}</p>
                        </div>
                    ) : (
                        <>
                            {groups.map((group) => (
                                <div key={group.date} className='relative'>
                                    <div className='sticky top-6 z-10 flex items-center gap-4 bg-background/5 backdrop-blur-sm p-2 rounded-2xl'>
                                        <h2 className='text-sm font-black uppercase tracking-[0.3em] text-primary/60 pl-2'>{group.label}</h2>
                                        <div className='h-[1px] flex-1 bg-gradient-to-r from-primary/20 to-transparent' />
                                    </div>

                                    <div className='space-y-4'>
                                        {group.items.map((memo: Memo) => (
                                            <MemoItem
                                                key={memo.id}
                                                memo={memo}
                                                isSelected={isSelected(memo.id)}
                                                selectionActive={selectedIds.size > 0}
                                                onToggle={toggleSelect}
                                                onSave={handleUpdate}
                                                onDelete={handleDelete}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Infinite Scroll Trigger */}
                            <div ref={observerTarget} className='h-40 flex items-center justify-center gap-4'>
                                {loadingMore && (
                                    <div className='flex items-center gap-2 text-xs text-muted-foreground opacity-60'>
                                        <Loader2 className='w-3 h-3 animate-spin' />
                                        <span>더 많은 기억을 불러오는 중...</span>
                                    </div>
                                )}
                                {!hasMore && groups.length > 0 && (
                                    <div className='flex flex-col items-center gap-4 opacity-40'>
                                        <div className='w-20 h-px bg-gradient-to-r from-transparent via-muted-foreground/50 to-transparent' />
                                        <div className='text-xs font-medium text-muted-foreground/60'>마지막 페이지입니다</div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <SelectionBar
                selectedCount={selectedIds.size}
                totalCount={memos.length}
                onClear={clearSelection}
                onSelectAll={selectAll}
                onDelete={handleBulkDelete}
            />

            <FeatureDiscovery />

            {/* Removed EditModal integration */}
        </div>
    );
}
