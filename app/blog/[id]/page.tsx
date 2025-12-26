"use client";

import { useState, useEffect } from "react";
import { Background } from "@/components/background";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { ArrowLeft, Sparkles, Stars } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MarkdownContent } from "@/components/markdown-content";

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
        } | null;
        created_at: string;
    } | null;
};

export default function PostPage() {
    const { id } = useParams();
    const router = useRouter();
    const [data, setData] = useState<PostData | null>(null);
    const [loading, setLoading] = useState(true);

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
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
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

    // Updated Accessors for new Schema
    const analysisContent = data.consultation?.analysis_data?.philosophy?.insight_ko || data.consultation?.analysis;
    // Prefer visual mood if available, otherwise fallback to sentiment emotion
    const mood = data.consultation?.analysis_data?.vision?.mood_ko || data.consultation?.analysis_data?.sentiment?.primaryEmotion_ko;
    const visionTags = data.consultation?.analysis_data?.vision?.objects_ko; // Use objects_ko

    return (
        <div className='min-h-screen p-6 relative'>
            <Background />
            <div className='max-w-3xl mx-auto space-y-8'>
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

                {data.post.mode === "consultation" && data.consultation && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}>
                        <Card className='p-8 relative overflow-hidden border border-indigo-100/50 dark:border-none bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/40 backdrop-blur-xl shadow-2xl shadow-indigo-500/5 dark:shadow-indigo-500/10 rounded-3xl'>
                            <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 dark:from-indigo-500 dark:via-purple-500 dark:to-indigo-500 animate-gradient-x opacity-70' />

                            {/* Rich Headers */}
                            <div className='flex flex-wrap items-center gap-3 mb-6'>
                                <div className='flex items-center'>
                                    <div className='p-2.5 rounded-2xl bg-white/50 dark:bg-indigo-400/10 shadow-sm mr-4'>
                                        <Sparkles className='w-5 h-5 text-indigo-500 dark:text-indigo-300' />
                                    </div>
                                    <h2 className='text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-300 dark:to-purple-300'>
                                        AI 인사이트
                                    </h2>
                                </div>

                                {mood && (
                                    <span className='px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20'>
                                        Mood: {mood}
                                    </span>
                                )}
                                {visionTags &&
                                    visionTags.map((tag, i) => (
                                        <span
                                            key={i}
                                            className='px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20'
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                            </div>

                            <div className='prose dark:prose-invert max-w-none text-lg leading-relaxed text-slate-800/90 dark:text-indigo-100/90 [font-style:italic]'>
                                <MarkdownContent content={analysisContent || ""} />
                            </div>
                        </Card>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
