"use client";

import { Background } from "@/components/background";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Activity, ArrowLeft, CheckCircle2, Quote, Sparkles, Stars } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PostData = {
    post: {
        id: string;
        title: string;
        content: string;
        mode: "standard" | "consultation";
        images: string[];
        created_at: string;
    };
    consultation: {
        analysis: string;
        analysis_data: {
            meta: any;
            sentiment: { primaryEmotion_ko: string; primaryEmotion_en: string; intensity: number };
            vision: { objects_ko: string[]; objects_en: string[]; mood_ko: string; mood_en: string } | null;
            philosophy: { lens_ko: string; lens_en: string; insight_ko: string; keywords_en: string[] };
            life_data?: { summary: string; growth_point: string; suggested_actions: string[]; selected_action?: string };
        } | null;
        created_at: string;
    } | null;
};

export default function PostPage() {
    const { id } = useParams();
    const router = useRouter();
    const [data, setData] = useState<PostData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [customInput, setCustomInput] = useState("");
    const supabase = createClient();

    const openCustomInputDialog = (initialValue: string = "") => {
        setCustomInput(initialValue);
        setIsDialogOpen(true);
    };

    useEffect(() => {
        if (id) {
            fetchPost();
        }
    }, [id]);

    const fetchPost = async () => {
        try {
            const res = await fetch(`/api/posts/${id}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
                // Initialize selected action if exists
                if (json.consultation?.analysis_data?.life_data?.selected_action) {
                    setSelectedAction(json.consultation.analysis_data.life_data.selected_action);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleActionSelect = async (action: string) => {
        if (!data?.consultation) return;

        // Optimistic UI update
        setSelectedAction(action);
        setIsDialogOpen(false);

        try {
            // Prepare updated data
            const currentAnalysisData = data.consultation.analysis_data;
            if (!currentAnalysisData || !currentAnalysisData.life_data) return;

            const updatedAnalysisData = {
                ...currentAnalysisData,
                life_data: {
                    ...currentAnalysisData.life_data,
                    selected_action: action,
                },
            };

            // Update DB
            const { error } = await supabase.from("consultations").update({ analysis_data: updatedAnalysisData }).eq("post_id", id);

            if (error) throw error;

            // Success Feedback
            toast.success("오늘의 문장이 안전하게 기록되었습니다.");

            // Update local state data to prevent revert on re-render
            setData((prev) =>
                prev
                    ? {
                          ...prev,
                          consultation: {
                              ...prev.consultation!,
                              analysis_data: updatedAnalysisData,
                          },
                      }
                    : null
            );
        } catch (e) {
            console.error("Failed to save action:", e);
            toast.error("저장에 실패했습니다.");
            setSelectedAction(null);
        }
    };

    if (loading) {
        return (
            <div className='min-h-screen flex items-center justify-center'>
                <Background />
                <div className='text-center animate-pulse'>
                    <Stars className='h-10 w-10 mx-auto mb-4 text-purple-500' />
                    <p>분석 중입니다...</p>
                </div>
            </div>
        );
    }

    if (!data) return <div>존재하지 않는 글입니다.</div>;

    // Helpers for Orbit OS Data
    const cData = data.consultation?.analysis_data;
    const lifeData = cData?.life_data;
    const mood = cData?.vision?.mood_ko || cData?.sentiment?.primaryEmotion_ko;
    const compassText = data.consultation?.analysis; // The main counsel

    return (
        <div className='min-h-screen p-6 relative'>
            <Background />
            <div className='max-w-4xl mx-auto space-y-8'>
                <header className='flex justify-between items-center mb-12'>
                    <Button
                        variant='ghost'
                        size='sm'
                        className='group hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all rounded-full px-4'
                        onClick={() => router.push("/blog")}
                    >
                        <ArrowLeft className='w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform' />
                        목록으로 돌아가기
                    </Button>
                    <Button
                        variant='outline'
                        size='sm'
                        className='rounded-full gap-2 border-primary/30 hover:border-primary transition-all'
                        onClick={() => router.replace(`/blog/edit/${id}`)}
                    >
                        <Sparkles className='w-4 h-4' /> 수정하기
                    </Button>
                </header>

                <Card className='p-8 bg-background/60 backdrop-blur-md shadow-sm border-none'>
                    {/* Images Gallery */}
                    {data.post.images && Array.isArray(data.post.images) && data.post.images.length > 0 && (
                        <div className='grid grid-cols-2 gap-4 mb-6'>
                            {data.post.images.map((url, i) => (
                                <div key={i} className='relative aspect-video rounded-2xl overflow-hidden shadow-sm bg-black/5'>
                                    <img
                                        src={url}
                                        alt={`Gallery ${i}`}
                                        className='object-cover w-full h-full hover:scale-105 transition-transform duration-500'
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <h1 className='text-3xl md:text-4xl font-bold mb-4'>{data.post.title}</h1>
                    <div className='text-sm text-muted-foreground mb-8 pb-4 border-b'>
                        {format(new Date(data.post.created_at), "MMMM d, yyyy • h:mm a")}
                    </div>
                    <div className='prose dark:prose-invert max-w-none text-lg leading-relaxed'>
                        <MarkdownContent content={data.post.content} />
                    </div>
                </Card>

                {/* Orbit OS Analysis Section */}
                {data.post.mode === "consultation" && data.consultation && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className='space-y-6'
                    >
                        {/* 1. Emotional Satellite (감정 위성) */}
                        <div className='rounded-3xl p-6 bg-gradient-to-r from-rose-50 to-indigo-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-white/20 shadow-lg relative overflow-hidden'>
                            <div className='absolute top-0 left-0 w-full h-full bg-white/40 dark:bg-black/10 backdrop-blur-sm z-0' />
                            <div className='relative z-10 flex items-center justify-between'>
                                <div className='flex items-center gap-3'>
                                    <div className='p-3 bg-white/80 dark:bg-indigo-500/20 rounded-full'>
                                        <Stars className='w-6 h-6 text-indigo-600 dark:text-indigo-300' />
                                    </div>
                                    <div>
                                        <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>감정 위성</h3>
                                        <p className='text-2xl font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2'>
                                            {mood || "분석 중"}
                                            <span className='text-sm font-normal opacity-70 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800'>
                                                깊이: {cData?.sentiment?.intensity ? Math.round(cData.sentiment.intensity * 100) : 0}%
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-5 gap-6'>
                            {/* 2. Today's Discovery (오늘의 발견) - Left (2/5) */}
                            {lifeData && (
                                <div className='md:col-span-2 bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 font-mono shadow-inner relative group flex flex-col justify-between'>
                                    <div className='space-y-6'>
                                        <h3 className='text-sm uppercase tracking-widest text-slate-400 dark:text-zinc-600 font-bold border-b border-slate-200 dark:border-zinc-900 pb-2 flex items-center gap-2'>
                                            <Sparkles className='w-4 h-4' /> 오늘의 발견
                                        </h3>

                                        <div>
                                            <span className='text-xs text-slate-400 dark:text-zinc-600 mb-2'>요약</span>
                                            <p className='text-lg text-slate-700 dark:text-emerald-400/90 leading-relaxed font-semibold'>
                                                {lifeData.summary}
                                            </p>
                                        </div>

                                        <div className='pt-4 border-t border-slate-200 dark:border-zinc-900/50'>
                                            <div className='flex items-start gap-3'>
                                                <CheckCircle2 className='w-5 h-5 text-blue-500 dark:text-cyan-500 mt-1 shrink-0' />
                                                <div>
                                                    <span className='block text-xs text-blue-400 dark:text-cyan-600 mb-1'>
                                                        잠재 에너지 (Potential Energy)
                                                    </span>
                                                    <p className='text-base text-slate-600 dark:text-zinc-300'>{lifeData.growth_point}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* User Choice Section */}
                                    <div className='mt-8 pt-4 border-t border-slate-200 dark:border-zinc-900/50'>
                                        <span className='block text-xs text-amber-500/80 dark:text-amber-700 mb-3 flex items-center gap-1 font-bold tracking-wider uppercase'>
                                            <Sparkles className='w-3 h-3' />
                                            프리즘의 실천 제안
                                        </span>
                                        <p className='text-[11px] text-slate-400 dark:text-zinc-500 mb-3'>
                                            {selectedAction ? "오늘 나의 마음에 남긴 문장:" : "오늘의 나에게 가장 필요한 한 문장을 선택하세요."}
                                        </p>
                                        <div className='space-y-2'>
                                            {lifeData.suggested_actions?.map((action, i) => (
                                                <button
                                                    key={i}
                                                    className={`w-full text-left p-3 rounded-xl border transition-all text-sm focus:outline-none 
                                                        ${
                                                            selectedAction === action
                                                                ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-medium ring-2 ring-indigo-500/20"
                                                                : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-400 dark:hover:border-zinc-600 hover:scale-[1.02]"
                                                        }
                                                    `}
                                                    onClick={() => handleActionSelect(action)}
                                                >
                                                    <div className='flex items-center gap-2'>
                                                        <span
                                                            className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                                                selectedAction === action
                                                                    ? "border-indigo-200 dark:border-indigo-800 bg-white/50"
                                                                    : "border-slate-100 dark:border-zinc-800"
                                                            }`}
                                                        >
                                                            {i + 1}
                                                        </span>
                                                        {action}
                                                        {selectedAction === action && <CheckCircle2 className='w-4 h-4 ml-auto text-indigo-500' />}
                                                    </div>
                                                </button>
                                            ))}

                                            {/* Custom Input Option - Always visible to allow switching */}
                                            {(!selectedAction ||
                                                (selectedAction &&
                                                    lifeData.suggested_actions &&
                                                    !lifeData.suggested_actions.includes(selectedAction))) && (
                                                <div className='relative'>
                                                    {selectedAction &&
                                                    lifeData.suggested_actions &&
                                                    !lifeData.suggested_actions.includes(selectedAction) ? (
                                                        // Show as Selected "Direct" Card
                                                        <button
                                                            className='w-full text-left p-3 rounded-xl border bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-medium ring-2 ring-indigo-500/20 text-sm hover:opacity-80 transition-opacity'
                                                            onClick={() => openCustomInputDialog(selectedAction)}
                                                        >
                                                            <div className='flex items-center gap-2'>
                                                                <span className='text-[10px] px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 bg-white/50'>
                                                                    Direct
                                                                </span>
                                                                {selectedAction}
                                                                <CheckCircle2 className='w-4 h-4 ml-auto text-indigo-500' />
                                                            </div>
                                                        </button>
                                                    ) : (
                                                        // Show as "+ Direct Input" Button
                                                        <button
                                                            className='w-full text-left p-3 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-zinc-500 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all text-sm flex items-center gap-2'
                                                            onClick={() => openCustomInputDialog("")}
                                                        >
                                                            <span className='text-[10px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700'>
                                                                +
                                                            </span>
                                                            직접 입력하기
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Fallback for when a PRESET is selected, we still want to show "+ Input" to allow switching away from preset to custom */}
                                            {selectedAction && lifeData.suggested_actions && lifeData.suggested_actions.includes(selectedAction) && (
                                                <button
                                                    className='w-full text-left p-3 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-zinc-500 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all text-sm flex items-center gap-2'
                                                    onClick={() => openCustomInputDialog("")}
                                                >
                                                    <span className='text-[10px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700'>
                                                        +
                                                    </span>
                                                    직접 입력하기
                                                </button>
                                            )}

                                            {!lifeData.suggested_actions && <p className='text-xs text-muted-foreground'>추천 액션이 없습니다.</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3. Deep Signal (심층 신호) - Right (3/5) */}
                            <div
                                className={`rounded-2xl p-8 border shadow-sm relative overflow-hidden ${
                                    lifeData ? "md:col-span-3" : "md:col-span-5"
                                } bg-[#FDFBF7] dark:bg-[#1c1917] border-stone-200 dark:border-stone-800`}
                            >
                                <div className='flex items-center gap-2 mb-6 text-amber-800 dark:text-stone-400'>
                                    <Activity className='w-6 h-6' />
                                    <span className='font-serif italic font-medium text-lg'>심층 신호 (Deep Signal)</span>
                                </div>

                                <div className='prose prose-stone dark:prose-invert max-w-none text-xl leading-relaxed font-serif'>
                                    <MarkdownContent content={compassText || ""} />
                                </div>

                                <div className='mt-12 pt-6 border-t border-stone-200 dark:border-stone-800 flex justify-end'>
                                    <div className='text-sm text-stone-400 font-serif italic flex items-center gap-2'>
                                        <Quote className='w-4 h-4' />
                                        {(() => {
                                            const personaId = cData?.meta?.persona || "prism";
                                            const names: Record<string, string> = {
                                                prism: "프리즘의 시선",
                                                nietzsche: "니체의 시선",
                                                aurelius: "아우렐리우스의 시선",
                                                jung: "칼 융의 시선",
                                                zhuangzi: "장자의 시선",
                                                beauvoir: "보부아르의 시선",
                                            };
                                            return `${names[personaId] || "프리즘의 시선"}: ${cData?.philosophy?.lens_ko}`;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Custom Input Dialog */}
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogContent className='sm:max-w-md bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-slate-200 dark:border-zinc-800'>
                                <DialogHeader>
                                    <DialogTitle>나만의 문장 기록하기</DialogTitle>
                                </DialogHeader>
                                <div className='space-y-4 py-4'>
                                    <p className='text-sm text-muted-foreground'>오늘 나의 마음을 가장 잘 표현하는 문장을 자유롭게 적어주세요.</p>
                                    <Input
                                        placeholder='예: 내 마음의 소리에 귀 기울이자'
                                        value={customInput}
                                        onChange={(e) => setCustomInput(e.target.value)}
                                        className='h-12 text-lg bg-slate-50 dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800 focus-visible:ring-indigo-500'
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && customInput.trim()) {
                                                handleActionSelect(customInput);
                                            }
                                        }}
                                        autoFocus
                                    />
                                </div>
                                <DialogFooter className='sm:justify-end gap-2'>
                                    <Button variant='outline' onClick={() => setIsDialogOpen(false)}>
                                        취소
                                    </Button>
                                    <Button
                                        onClick={() => handleActionSelect(customInput)}
                                        disabled={!customInput.trim()}
                                        className='bg-indigo-600 hover:bg-indigo-700 text-white'
                                    >
                                        기록하기
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
