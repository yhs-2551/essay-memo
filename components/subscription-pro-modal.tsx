"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Star, Zap, Infinity } from "lucide-react";
import { useTheme } from "next-themes";
import { useUsageStore } from "@/hooks/use-usage-limit";
import { toast } from "sonner";

interface SubscriptionProModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SubscriptionProModal({ open, onOpenChange }: SubscriptionProModalProps) {
    const { theme } = useTheme();
    const { setSubscribed } = useUsageStore();

    const handleUpgrade = () => {
        setSubscribed(true);
        onOpenChange(false);
        toast.success("무제한 우주 여행자가 되신 것을 환영합니다!");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md border-0 bg-transparent shadow-none p-0 overflow-hidden'>
                <div className='relative h-full w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden'>
                    {/* Cosmic Background Effects */}
                    <div className='absolute -top-20 -right-20 w-40 h-40 bg-purple-500/30 rounded-full blur-[50px] animate-pulse' />
                    <div className='absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/30 rounded-full blur-[50px] animate-pulse delay-700' />

                    <DialogHeader className='relative z-10 text-center space-y-4'>
                        <div className='mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg mb-2'>
                            <Sparkles className='w-8 h-8 text-white' />
                        </div>
                        <DialogTitle className='text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400'>
                            Unlock the Universe
                        </DialogTitle>
                        <DialogDescription className='text-muted-foreground text-base'>더 깊은 통찰과 무제한의 기록을 경험하세요.</DialogDescription>
                    </DialogHeader>

                    <div className='mt-8 space-y-4 relative z-10'>
                        <div className='flex items-center p-3 rounded-lg bg-background/50 border border-border/50'>
                            <div className='p-2 rounded-md bg-purple-100 dark:bg-purple-900/30 mr-3'>
                                <Infinity className='w-5 h-5 text-purple-600 dark:text-purple-400' />
                            </div>
                            <div className='flex-1'>
                                <h4 className='font-semibold text-sm'>무제한 AI 상담</h4>
                                <p className='text-xs text-muted-foreground'>횟수 제한 없는 깊은 대화</p>
                            </div>
                        </div>

                        <div className='flex items-center p-3 rounded-lg bg-background/50 border border-border/50'>
                            <div className='p-2 rounded-md bg-blue-100 dark:bg-blue-900/30 mr-3'>
                                <Zap className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                            </div>
                            <div className='flex-1'>
                                <h4 className='font-semibold text-sm'>실시간 감정 분석</h4>
                                <p className='text-xs text-muted-foreground'>내 감정의 흐름을 시각화</p>
                            </div>
                        </div>

                        <div className='flex items-center p-3 rounded-lg bg-background/50 border border-border/50'>
                            <div className='p-2 rounded-md bg-amber-100 dark:bg-amber-900/30 mr-3'>
                                <Star className='w-5 h-5 text-amber-600 dark:text-amber-400' />
                            </div>
                            <div className='flex-1'>
                                <h4 className='font-semibold text-sm'>프리미엄 테마</h4>
                                <p className='text-xs text-muted-foreground'>나만의 우주 공간 커스터마이징</p>
                            </div>
                        </div>
                    </div>

                    <div className='mt-8 relative z-10'>
                        <Button
                            onClick={handleUpgrade}
                            className='w-full h-12 rounded-xl text-lg font-medium shadow-xl hover:scale-[1.02] transition-transform bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-none'
                        >
                            업그레이드 하기
                        </Button>
                        <p className='text-[10px] text-center text-muted-foreground mt-3'>데모 버전에서는 즉시 활성화됩니다.</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
