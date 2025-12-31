'use client'

import { useState, useEffect, useRef } from 'react'
import { Background } from '@/components/background'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Sparkles, Save, Eye, Layout, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { format } from 'date-fns'

import { useAutoSave } from '@/hooks/use-auto-save'
import { useImageUpload } from '@/hooks/use-image-upload'
import { useNavigationWarning } from '@/hooks/use-navigation-warning'
import { ImageUploadButton } from '@/components/image-upload-button'
import { useUsageStore, MAX_FREE_CONSULTATIONS } from '@/hooks/use-usage-limit'
import { SubscriptionProModal } from '@/components/subscription-pro-modal'
import { PersonaSelectionModal } from '@/components/persona-selection-modal'
import { PERSONAS } from '@/lib/constants'
import { ImagePreviewStrip } from '@/components/image-preview-strip'
import { MarkdownContent } from '@/components/markdown-content'

interface BlogEditorProps {
    initialData?: {
        id?: string
        title: string
        content: string
        mode: 'standard' | 'consultation'
    }
    initialConsultation?: {
        analysis: string
    }
    isEditing?: boolean
}

export function BlogEditor({ initialData, initialConsultation, isEditing = false }: BlogEditorProps) {
    const [title, setTitle] = useState(initialData?.title || '')
    const [content, setContent] = useState(initialData?.content || '')
    const [uploadedImages, setUploadedImages] = useState<string[]>([])
    const [mode, setMode] = useState<'standard' | 'consultation'>(initialData?.mode || 'standard')
    const [persona, setPersona] = useState('prism')
    const [loading, setLoading] = useState(false)
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
    const [updateAi, setUpdateAi] = useState(isEditing && initialData?.mode === 'consultation')
    const router = useRouter()
    const { theme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const toastShownRef = useRef(false)

    const [showPersonaModal, setShowPersonaModal] = useState(false)

    const hasUnsavedChanges = title !== (initialData?.title || '') || content !== (initialData?.content || '')
    useNavigationWarning(hasUnsavedChanges)

    const autoSaveKey = isEditing ? `draft-edit-post-${initialData?.id}` : 'draft-new-post'
    const { isSaving, lastSavedAt, loadDraft, clearDraft } = useAutoSave(autoSaveKey, { title, content, mode }, 2000)

    const { handlePaste, isUploading } = useImageUpload()

    const { count, isSubscribed, increment, refreshUsage } = useUsageStore()
    const [showSubscription, setShowSubscription] = useState(false)

    useEffect(() => {
        refreshUsage()
    }, [refreshUsage])

    useEffect(() => {
        setMounted(true)
        if (!isEditing) {
            const load = async () => {
                const draft = await loadDraft()
                if (draft && (draft.title || draft.content)) {
                    // [UX Upgrade] Don't auto-load. Ask first.
                    toast('이전에 작성하던 글이 발견되었습니다.', {
                        description: '작성하던 내용을 복구하시겠습니까?',
                        action: {
                            label: '복구하기',
                            onClick: () => {
                                if (draft.title) setTitle(draft.title)
                                if (draft.content) setContent(draft.content)
                                if (draft.mode) setMode(draft.mode)
                                toast.success('글이 성공적으로 복구되었습니다.')
                            },
                        },
                        cancel: {
                            label: '삭제',
                            onClick: () => {
                                // Clear draft if user rejects
                                clearDraft()
                                toast.info('임시 저장된 글을 삭제했습니다.')
                            },
                        },
                        duration: 8000, // Give user enough time
                    })
                }
            }
            load()
        }
    }, [loadDraft, isEditing])

    // ===== Helper Functions (Clean Code: SRP) =====

    const validateEditorInput = (): boolean => {
        if (!title.trim() || !content.trim()) {
            toast.error('제목과 내용을 모두 입력해주세요.')
            return false
        }
        return true
    }

    const shouldAnalyzeContent = (): boolean => {
        if (mode !== 'consultation') return false
        if (!isEditing) return true
        if (updateAi) return true
        if (initialData?.mode === 'standard') return true
        return false
    }

    const checkAIQuota = async (): Promise<boolean> => {
        if (isSubscribed) return true

        await useUsageStore.getState().refreshUsage()
        const currentCount = useUsageStore.getState().count

        if (currentCount >= MAX_FREE_CONSULTATIONS) {
            setShowSubscription(true)
            return false
        }
        return true
    }

    const savePostToDatabase = async () => {
        const url = isEditing ? `/api/posts/${initialData?.id}` : '/api/posts'
        const method = isEditing ? 'PATCH' : 'POST'

        const payload = {
            title,
            content,
            mode,
            is_published: true,
            images: uploadedImages,
        }

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })

        const post = await res.json()
        if (!post?.id) throw new Error('저장 실패')

        return post
    }

    const runAIAnalysis = async (postId: string): Promise<void> => {
        try {
            const aiRes = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, persona }),
            })

            if (aiRes.ok) {
                if (!isSubscribed) increment()
            } else if (aiRes.status === 403) {
                toast.error('일일 무료 상담 횟수를 모두 사용했습니다.')
                setShowSubscription(true)
            } else {
                toast.error('AI 분석 중 문제가 발생했습니다.')
            }
        } catch (aiError) {
            console.error('AI analysis failed:', aiError)
            toast.error('AI 연결에 실패했습니다.')
        }
    }

    // ===== Main Submit Handler (Orchestrator) =====

    const handleSubmit = async () => {
        // Guard: Input validation
        if (!validateEditorInput()) return

        const willAnalyze = shouldAnalyzeContent()

        // Guard: AI quota check
        if (willAnalyze) {
            const hasQuota = await checkAIQuota()
            if (!hasQuota) return
        }

        // Info: Image limit notification
        if (willAnalyze && uploadedImages.length > 5) {
            toast.info('깊이 있는 통찰을 위해, AI는 가장 중요한 첫 5장의 시각적 기억에 집중합니다.', { duration: 5000 })
        }

        setLoading(true)
        try {
            const post = await savePostToDatabase()
            clearDraft()

            if (willAnalyze) {
                await runAIAnalysis(post.id)
            }

            toast.success(isEditing ? '수정되었습니다.' : '저장되었습니다.')
            router.refresh()
            router.replace(`/blog/${post.id}`)
        } catch (e) {
            console.error(e)
            toast.error('저장 중 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveImage = (url: string) => {
        setUploadedImages((prev) => prev.filter((u) => u !== url))
    }

    const selectedPersonaObj = PERSONAS.find((p) => p.id === persona) || PERSONAS[0]

    return (
        <div className="min-h-screen p-6 pt-24 relative">
            <Background />
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
                <header className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <h1 className="text-2xl font-bold">{isEditing ? '에세이 수정' : '새 에세이'}</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                            {isSaving ? 'Auto-saving...' : lastSavedAt ? `Saved ${format(lastSavedAt, 'h:mm a')}` : ''}
                        </div>
                        <div className="flex bg-muted/50 p-1 rounded-full">
                            <Button
                                variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="rounded-full text-xs h-8"
                                onClick={() => setViewMode('edit')}
                            >
                                <Layout className="w-3 h-3 mr-1" /> 편집
                            </Button>
                            <Button
                                variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="rounded-full text-xs h-8"
                                onClick={() => setViewMode('preview')}
                            >
                                <Eye className="w-3 h-3 mr-1" /> 프리뷰
                            </Button>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
                    <div className="space-y-4 min-w-0">
                        {viewMode === 'edit' ? (
                            <Card className="p-8 bg-background/60 backdrop-blur-xl border-none shadow-2xl min-h-[600px] flex flex-col">
                                <Input
                                    data-testid="editor-title"
                                    placeholder="제목을 입력하세요..."
                                    className="text-3xl font-bold border-none bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground/30 h-auto py-2"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                                <div className="h-px bg-border/50 my-6" />
                                <Textarea
                                    data-testid="editor-content"
                                    placeholder="당신의 진솔한 기록을 들려주세요..."
                                    className="flex-1 border-none bg-transparent px-0 text-lg resize-none focus-visible:ring-0 leading-relaxed min-h-[400px]"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    onPaste={async (e) => {
                                        if (uploadedImages.length >= 20) {
                                            toast.error('이미지는 최대 20개까지만 첨부할 수 있습니다.')
                                            return
                                        }
                                        const url = await handlePaste(e)
                                        if (url) setUploadedImages((prev) => [...prev, url])
                                    }}
                                    disabled={isUploading}
                                />

                                <ImagePreviewStrip urls={uploadedImages} showRemove onRemove={handleRemoveImage} />
                                <div className="flex items-center mt-4 pt-4 border-t border-border/50">
                                    <ImageUploadButton
                                        variant="ghost"
                                        className="text-muted-foreground hover:text-primary"
                                        onUploadComplete={(url) => setUploadedImages((prev) => [...prev, url])}
                                        label={uploadedImages.length >= 20 ? '이미지 첨부 제한 도달 (최대 20개)' : '이미지 첨부'}
                                        disabled={uploadedImages.length >= 20}
                                    />
                                    <span className="text-xs text-muted-foreground/50 ml-2">{uploadedImages.length}/20</span>
                                </div>
                            </Card>
                        ) : (
                            <Card className="p-8 bg-background/40 backdrop-blur-xl border-none shadow-2xl min-h-[600px]">
                                <h1 className="text-3xl font-bold mb-6">{title || '제목 없음'}</h1>
                                <div className="prose dark:prose-invert max-w-none">
                                    <MarkdownContent content={content || '*내용이 없습니다.*'} />
                                </div>
                            </Card>
                        )}
                    </div>

                    <div className="space-y-6">
                        <Card className="p-5 bg-background/60 backdrop-blur-md border-none shadow-xl">
                            <h3 className="font-bold text-sm mb-4 uppercase tracking-tighter">인사이트 모드</h3>
                            <div className="space-y-3">
                                <div
                                    data-testid="mode-standard"
                                    className={`p-4 rounded-2xl border-2 transition-all group cursor-pointer ${
                                        mode === 'standard' ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'
                                    }`}
                                    onClick={() => setMode('standard')}
                                >
                                    <div className="font-bold text-sm">자유 기록</div>
                                    <div className="text-[10px] text-muted-foreground mt-1">별다른 개입 없이 기록에 집중합니다.</div>
                                </div>

                                <div
                                    data-testid="mode-consultation"
                                    className={`p-4 rounded-2xl border-2 transition-all group cursor-pointer ${
                                        mode === 'consultation'
                                            ? 'border-purple-500 bg-purple-500/5'
                                            : 'border-transparent hover:bg-muted/50'
                                    }`}
                                    onClick={() => {
                                        if (mode !== 'consultation' && !isSubscribed && count >= MAX_FREE_CONSULTATIONS) {
                                            setShowSubscription(true)
                                            return
                                        }
                                        setMode('consultation')
                                        if (isEditing) setUpdateAi(true)
                                    }}
                                >
                                    <div className="font-bold text-sm flex items-center text-purple-600 dark:text-purple-300">
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        AI 인사이트
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-1">심리적 분석과 위로를 제공합니다.</div>
                                </div>

                                {mode === 'consultation' && (
                                    <Card className="p-5 bg-background/60 backdrop-blur-md border-none shadow-xl mt-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-sm uppercase tracking-tighter">
                                                위대한 정신
                                                {mounted && !isSubscribed && (
                                                    <span className="ml-2 text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-muted-foreground">
                                                        PRO
                                                    </span>
                                                )}
                                            </h3>
                                        </div>

                                        <div
                                            className="group relative bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/40 dark:to-purple-950/20 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-500/30 cursor-pointer overflow-hidden transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-400"
                                            onClick={() => setShowPersonaModal(true)}
                                        >
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-indigo-900/60 shadow-sm flex items-center justify-center text-3xl ring-2 ring-indigo-50 dark:ring-indigo-500/20 group-hover:scale-105 transition-transform">
                                                    {selectedPersonaObj.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-lg text-indigo-950 dark:text-indigo-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                                                        {selectedPersonaObj.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate opacity-80 group-hover:opacity-100">
                                                        {selectedPersonaObj.desc}
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                            </div>

                                            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 dark:group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
                                        </div>

                                        <div className="text-center mt-3">
                                            <span
                                                onClick={() => setShowPersonaModal(true)}
                                                className="text-[10px] text-muted-foreground cursor-pointer hover:underline hover:text-indigo-500"
                                            >
                                                모든 페르소나 보기
                                            </span>
                                        </div>
                                    </Card>
                                )}
                            </div>

                            {isEditing && mode === 'consultation' && (
                                <div className="mt-6 pt-6 border-t border-border/50 space-y-4">
                                    {initialConsultation && (
                                        <div className="space-y-2">
                                            <div className="flex items-center text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                                                <Sparkles className="w-3 h-3 mr-1" />
                                                기존 AI 인사이트
                                            </div>
                                            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-[11px] leading-relaxed text-slate-700 dark:text-indigo-200/80 italic">
                                                <MarkdownContent
                                                    content={initialConsultation.analysis}
                                                    className="line-clamp-6 overflow-hidden text-ellipsis"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="space-y-0.5 min-w-0 flex-1">
                                            <div className="text-[11px] font-bold text-purple-600 dark:text-purple-300">
                                                AI 통찰 업데이트
                                            </div>
                                            <div className="text-[9px] text-muted-foreground leading-tight">
                                                저장 시 새로운 내용을 바탕으로 다시 분석합니다.
                                            </div>
                                        </div>
                                        <div
                                            className={`shrink-0 w-10 h-5 rounded-full relative cursor-pointer transition-all duration-300 ${
                                                updateAi ? 'bg-purple-500' : 'bg-muted'
                                            }`}
                                            onClick={() => {
                                                if (!updateAi && !isSubscribed && count >= MAX_FREE_CONSULTATIONS) {
                                                    setShowSubscription(true)
                                                    return
                                                }
                                                setUpdateAi(!updateAi)
                                            }}
                                        >
                                            <div
                                                className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${
                                                    updateAi ? 'left-6' : 'left-1'
                                                }`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>

                        <div className="sticky top-6">
                            <Button
                                data-testid="editor-submit"
                                className="w-full h-14 rounded-2xl shadow-2xl shadow-primary/20 text-lg font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                onClick={handleSubmit}
                                disabled={loading}
                                variant={mounted ? (theme === 'dark' ? 'cosmic' : 'cute') : 'default'}
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <Sparkles className="animate-spin mr-2 h-5 w-5" /> 분석 중...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Save className="w-5 h-5" />
                                        {isEditing ? '수정 완료' : mode === 'consultation' ? '분석 시작' : '저장 완료'}
                                    </span>
                                )}
                            </Button>

                            {mode === 'consultation' && (
                                <div className="mt-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed italic">
                                    "당신의 진심을 적어주세요. 내면의 목소리에 귀를 기울여 드릴게요."
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <SubscriptionProModal open={showSubscription} onOpenChange={setShowSubscription} />
            <PersonaSelectionModal
                open={showPersonaModal}
                onOpenChange={setShowPersonaModal}
                selectedPersona={persona}
                onSelect={(id) => {
                    setPersona(id)
                    setUpdateAi(true)
                }}
                isSubscribed={isSubscribed || false}
                onSubscribeClick={() => setShowSubscription(true)}
            />
        </div>
    )
}
