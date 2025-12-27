"use client";

import { useState, useEffect, useRef } from "react";
import { Background } from "@/components/background";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Save, Eye, Layout } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { format } from "date-fns";

import { useAutoSave } from "@/hooks/use-auto-save";
import { useImageUpload } from "@/hooks/use-image-upload";
import { useNavigationWarning } from "@/hooks/use-navigation-warning";
import { ImageUploadButton } from "@/components/image-upload-button";
import { useUsageStore, MAX_FREE_CONSULTATIONS } from "@/hooks/use-usage-limit";
import { SubscriptionProModal } from "@/components/subscription-pro-modal";
import { ImagePreviewStrip } from "@/components/image-preview-strip";
import { MarkdownContent } from "@/components/markdown-content";

interface BlogEditorProps {
    initialData?: {
        id?: string;
        title: string;
        content: string;
        mode: "standard" | "consultation";
    };
    initialConsultation?: {
        analysis: string;
    };
    isEditing?: boolean;
}

export function BlogEditor({ initialData, initialConsultation, isEditing = false }: BlogEditorProps) {
    const [title, setTitle] = useState(initialData?.title || "");
    const [content, setContent] = useState(initialData?.content || "");
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [mode, setMode] = useState<"standard" | "consultation">(initialData?.mode || "standard");
    const [persona, setPersona] = useState("prism");
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
    const [updateAi, setUpdateAi] = useState(isEditing && initialData?.mode === "consultation");
    const router = useRouter();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const toastShownRef = useRef(false);

    const hasUnsavedChanges = title !== (initialData?.title || "") || content !== (initialData?.content || "");
    useNavigationWarning(hasUnsavedChanges);

    const autoSaveKey = isEditing ? `draft-edit-post-${initialData?.id}` : "draft-new-post";
    const { isSaving, lastSavedAt, loadDraft, clearDraft } = useAutoSave(autoSaveKey, { title, content, mode }, 2000);

    const { handlePaste, isUploading } = useImageUpload();

    const { count, isSubscribed, increment } = useUsageStore();
    const [showSubscription, setShowSubscription] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!isEditing) {
            const draft = loadDraft();
            if (draft) {
                if (draft.title) setTitle(draft.title);
                if (draft.content) setContent(draft.content);
                if (draft.mode) setMode(draft.mode);
                if ((draft.title || draft.content) && !toastShownRef.current) {
                    toastShownRef.current = true;
                    toast.info("이전에 작성하던 글을 불러왔습니다.");
                }
            }
        }
    }, [loadDraft, isEditing]);

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) {
            toast.error("제목과 내용을 모두 입력해주세요.");
            return;
        }

        const wasStandard = isEditing && initialData?.mode === "standard";
        const willAnalyze = mode === "consultation" && (!isEditing || updateAi || wasStandard);

        // [STRICT CHECK] 저장 전에 최신 사용량을 서버에서 강제로 다시 확인합니다.
        // 프론트엔드 상태가 꼬여서 저장이 되어버리는 것을 방지하기 위함입니다.
        if (willAnalyze && !isSubscribed) {
            await useUsageStore.getState().refreshUsage(); // 강제 리프레시
            const currentCount = useUsageStore.getState().count;

            if (currentCount >= MAX_FREE_CONSULTATIONS) {
                setShowSubscription(true);
                return; // 저장 로직 자체를 중단합니다.
            }
        }

        if (willAnalyze && !isSubscribed && count >= MAX_FREE_CONSULTATIONS) {
            setShowSubscription(true);
            return;
        }

        setLoading(true);
        try {
            // [CHANGED] Images are now sent separately, not embedded in markdown
            const finalContent = content;

            const url = isEditing ? `/api/posts/${initialData?.id}` : "/api/posts";
            const method = isEditing ? "PATCH" : "POST";

            const payload = {
                title,
                content: finalContent,
                mode,
                is_published: true,
                images: uploadedImages, // Send detached images
            };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const post = await res.json();

            if (post && post.id) {
                clearDraft();

                if (mode === "consultation" && willAnalyze) {
                    try {
                        const aiRes = await fetch("/api/ai/analyze", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ postId: post.id, persona }),
                        });

                        if (aiRes.ok) {
                            if (!isSubscribed) increment();
                        } else if (aiRes.status === 403) {
                            // Quota exceeded
                            toast.error("일일 무료 상담 횟수를 모두 사용했습니다.");
                            setShowSubscription(true);
                        } else {
                            toast.error("AI 분석 중 문제가 발생했습니다.");
                        }
                    } catch (aiError) {
                        console.error("AI analysis failed:", aiError);
                        toast.error("AI 연결에 실패했습니다.");
                    }
                }

                toast.success(isEditing ? "수정되었습니다." : "저장되었습니다.");
                router.refresh();
                router.replace(`/blog/${post.id}`);
            } else {
                throw new Error("저장 실패");
            }
        } catch (e) {
            console.error(e);
            toast.error("저장 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveImage = (url: string) => {
        setUploadedImages((prev) => prev.filter((u) => u !== url));
    };

    return (
        <div className='min-h-screen p-6 pt-24 relative'>
            <Background />
            <div className='max-w-4xl mx-auto space-y-6 pb-20'>
                <header className='flex items-center justify-between'>
                    <div className='flex items-center space-x-4'>
                        <Button variant='ghost' size='icon' onClick={() => router.back()}>
                            <ArrowLeft className='h-6 w-6' />
                        </Button>
                        <h1 className='text-2xl font-bold'>{isEditing ? "에세이 수정" : "새 에세이"}</h1>
                    </div>
                    <div className='flex items-center gap-4'>
                        <div className='text-[10px] text-muted-foreground uppercase tracking-widest'>
                            {isSaving ? "Auto-saving..." : lastSavedAt ? `Saved ${format(lastSavedAt, "h:mm a")}` : ""}
                        </div>
                        <div className='flex bg-muted/50 p-1 rounded-full'>
                            <Button
                                variant={viewMode === "edit" ? "secondary" : "ghost"}
                                size='sm'
                                className='rounded-full text-xs h-8'
                                onClick={() => setViewMode("edit")}
                            >
                                <Layout className='w-3 h-3 mr-1' /> 편집
                            </Button>
                            <Button
                                variant={viewMode === "preview" ? "secondary" : "ghost"}
                                size='sm'
                                className='rounded-full text-xs h-8'
                                onClick={() => setViewMode("preview")}
                            >
                                <Eye className='w-3 h-3 mr-1' /> 프리뷰
                            </Button>
                        </div>
                    </div>
                </header>

                <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
                    <div className='lg:col-span-3 space-y-4'>
                        {viewMode === "edit" ? (
                            <Card className='p-8 bg-background/60 backdrop-blur-xl border-none shadow-2xl min-h-[600px] flex flex-col'>
                                <Input
                                    placeholder='제목을 입력하세요...'
                                    className='text-3xl font-bold border-none bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground/30 h-auto py-2'
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                                <div className='h-px bg-border/50 my-6' />
                                <Textarea
                                    placeholder='당신의 진솔한 기록을 들려주세요...'
                                    className='flex-1 border-none bg-transparent px-0 text-lg resize-none focus-visible:ring-0 leading-relaxed min-h-[400px]'
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    onPaste={async (e) => {
                                        const url = await handlePaste(e);
                                        if (url) setUploadedImages((prev) => [...prev, url]);
                                    }}
                                    disabled={isUploading}
                                />

                                <ImagePreviewStrip urls={uploadedImages} showRemove onRemove={handleRemoveImage} />
                                <div className='flex items-center mt-4 pt-4 border-t border-border/50'>
                                    <ImageUploadButton
                                        variant='ghost'
                                        className='text-muted-foreground hover:text-primary'
                                        onUploadComplete={(url) => setUploadedImages((prev) => [...prev, url])}
                                        label='이미지 첨부'
                                    />
                                </div>
                            </Card>
                        ) : (
                            <Card className='p-8 bg-background/40 backdrop-blur-xl border-none shadow-2xl min-h-[600px]'>
                                <h1 className='text-3xl font-bold mb-6'>{title || "제목 없음"}</h1>
                                <div className='prose dark:prose-invert max-w-none'>
                                    <MarkdownContent content={content || "*내용이 없습니다.*"} />
                                </div>
                            </Card>
                        )}
                    </div>

                    <div className='space-y-6'>
                        <Card className='p-6 bg-background/60 backdrop-blur-md border-none shadow-xl'>
                            <h3 className='font-bold text-sm mb-4 uppercase tracking-tighter'>인사이트 모드</h3>
                            <div className='space-y-3'>
                                <div
                                    className={`p-4 rounded-2xl border-2 transition-all group cursor-pointer ${
                                        mode === "standard" ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"
                                    }`}
                                    onClick={() => setMode("standard")}
                                >
                                    <div className='font-bold text-sm'>자유 기록</div>
                                    <div className='text-[10px] text-muted-foreground mt-1'>별다른 개입 없이 기록에 집중합니다.</div>
                                </div>

                                <div
                                    className={`p-4 rounded-2xl border-2 transition-all group cursor-pointer ${
                                        mode === "consultation" ? "border-purple-500 bg-purple-500/5" : "border-transparent hover:bg-muted/50"
                                    }`}
                                    onClick={() => {
                                        if (mode !== "consultation" && !isSubscribed && count >= MAX_FREE_CONSULTATIONS) {
                                            setShowSubscription(true);
                                            return;
                                        }
                                        setMode("consultation");
                                        if (isEditing) setUpdateAi(true);
                                    }}
                                >
                                    <div className='font-bold text-sm flex items-center text-purple-600 dark:text-purple-300'>
                                        <Sparkles className='w-3 h-3 mr-1' />
                                        AI 인사이트
                                    </div>
                                    <div className='text-[10px] text-muted-foreground mt-1'>심리적 분석과 위로를 제공합니다.</div>
                                </div>

                                {mode === "consultation" && (
                                    <Card className='p-6 bg-background/60 backdrop-blur-md border-none shadow-xl mt-6'>
                                        <h3 className='font-bold text-sm mb-4 uppercase tracking-tighter flex items-center justify-between'>
                                            위대한 정신
                                            {mounted && !isSubscribed && (
                                                <span className='text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-muted-foreground'>
                                                    PRO
                                                </span>
                                            )}
                                        </h3>

                                        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                            {[
                                                { id: "prism", name: "프리즘", desc: "내면의 진실을 비추는 균형", icon: "✨" },
                                                { id: "nietzsche", name: "니체", desc: "운명을 사랑하는 초인", icon: "🔥" },
                                                { id: "aurelius", name: "아우렐리우스", desc: "흔들리지 않는 평온", icon: "🏛️" },
                                                { id: "jung", name: "칼 융", desc: "무의식의 그림자 탐구", icon: "🌑" },
                                                { id: "zhuangzi", name: "장자", desc: "자유로운 우주의 나비", icon: "🦋" },
                                                { id: "beauvoir", name: "보부아르", desc: "실존과 주체적 자유", icon: "👠" },
                                            ].map((p) => (
                                                <div
                                                    key={p.id}
                                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                                                        persona === p.id
                                                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm"
                                                            : "border-transparent hover:bg-muted/50"
                                                    } ${mounted && !isSubscribed && p.id !== "prism" ? "opacity-50 grayscale" : ""}`}
                                                    onClick={() => {
                                                        if (!isSubscribed && p.id !== "prism") {
                                                            setShowSubscription(true);
                                                            return;
                                                        }
                                                        setPersona(p.id);
                                                        setUpdateAi(true);
                                                    }}
                                                >
                                                    <div className='text-xl shrink-0'>{p.icon}</div>
                                                    <div className='min-w-0 flex-1'>
                                                        <div className='font-bold text-sm truncate'>{p.name}</div>
                                                        <div className='text-[10px] text-muted-foreground truncate'>{p.desc}</div>
                                                    </div>
                                                    {persona === p.id && <div className='ml-auto w-2 h-2 rounded-full bg-indigo-500 shrink-0' />}
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}
                            </div>

                            {isEditing && mode === "consultation" && (
                                <div className='mt-6 pt-6 border-t border-border/50 space-y-4'>
                                    {initialConsultation && (
                                        <div className='space-y-2'>
                                            <div className='flex items-center text-[10px] font-bold text-indigo-500 uppercase tracking-wider'>
                                                <Sparkles className='w-3 h-3 mr-1' />
                                                기존 AI 인사이트
                                            </div>
                                            <div className='p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-[11px] leading-relaxed text-slate-700 dark:text-indigo-200/80 italic'>
                                                <MarkdownContent
                                                    content={initialConsultation.analysis}
                                                    className='line-clamp-6 overflow-hidden text-ellipsis'
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className='flex items-center justify-between gap-4'>
                                        <div className='space-y-0.5 min-w-0 flex-1'>
                                            <div className='text-[11px] font-bold text-purple-600 dark:text-purple-300'>AI 통찰 업데이트</div>
                                            <div className='text-[9px] text-muted-foreground leading-tight'>
                                                저장 시 새로운 내용을 바탕으로 다시 분석합니다.
                                            </div>
                                        </div>
                                        <div
                                            className={`shrink-0 w-10 h-5 rounded-full relative cursor-pointer transition-all duration-300 ${
                                                updateAi ? "bg-purple-500" : "bg-muted"
                                            }`}
                                            onClick={() => {
                                                if (!updateAi && !isSubscribed && count >= MAX_FREE_CONSULTATIONS) {
                                                    setShowSubscription(true);
                                                    return;
                                                }
                                                setUpdateAi(!updateAi);
                                            }}
                                        >
                                            <div
                                                className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${
                                                    updateAi ? "left-6" : "left-1"
                                                }`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>

                        <div className='sticky top-6'>
                            <Button
                                className='w-full h-14 rounded-2xl shadow-2xl shadow-primary/20 text-lg font-bold transition-all hover:scale-[1.02] active:scale-[0.98]'
                                onClick={handleSubmit}
                                disabled={loading}
                                variant={mounted ? (theme === "dark" ? "cosmic" : "cute") : "default"}
                            >
                                {loading ? (
                                    <span className='flex items-center'>
                                        <Sparkles className='animate-spin mr-2 h-5 w-5' /> 분석 중...
                                    </span>
                                ) : (
                                    <span className='flex items-center gap-2'>
                                        <Save className='w-5 h-5' />
                                        {isEditing ? "수정 완료" : mode === "consultation" ? "분석 시작" : "저장 완료"}
                                    </span>
                                )}
                            </Button>

                            {mode === "consultation" && (
                                <div className='mt-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed italic'>
                                    "당신의 진심을 적어주세요. 내면의 목소리에 귀를 기울여 드릴게요."
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <SubscriptionProModal open={showSubscription} onOpenChange={setShowSubscription} />
        </div>
    );
}
