'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Lock } from 'lucide-react'
import { PERSONAS } from '@/lib/constants'

interface PersonaSelectionModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedPersona: string
    onSelect: (id: string) => void
    isSubscribed: boolean
    onSubscribeClick: () => void
}

export function PersonaSelectionModal({
    open,
    onOpenChange,
    selectedPersona,
    onSelect,
    isSubscribed,
    onSubscribeClick,
}: PersonaSelectionModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[85vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-none shadow-2xl p-6 md:p-8">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-bold text-center">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-300 dark:to-purple-300">
                            위대한 정신을 선택하세요
                        </span>
                    </DialogTitle>
                    <p className="text-center text-muted-foreground text-sm mt-2">당신의 고민을 가장 깊이 이해해줄 멘토를 부르세요.</p>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {PERSONAS.map((p) => {
                        const isLocked = !isSubscribed && p.id !== 'prism'
                        const isSelected = selectedPersona === p.id

                        return (
                            <div
                                key={p.id}
                                className={`relative p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer group hover:-translate-y-1 ${
                                    isSelected
                                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-lg shadow-indigo-500/10'
                                        : 'border-transparent bg-secondary/30 hover:bg-secondary/50 hover:border-indigo-500/30'
                                }`}
                                onClick={() => {
                                    if (isLocked) {
                                        onSubscribeClick()
                                    } else {
                                        onSelect(p.id)
                                        onOpenChange(false)
                                    }
                                }}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div
                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${
                                            isSelected ? 'bg-white dark:bg-indigo-900/80' : 'bg-background'
                                        }`}
                                    >
                                        {p.icon}
                                    </div>
                                    {isLocked && (
                                        <div className="bg-slate-900/10 dark:bg-white/10 p-1.5 rounded-full backdrop-blur-sm">
                                            <Lock className="w-3 h-3 text-muted-foreground" />
                                        </div>
                                    )}
                                    {isSelected && <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />}
                                </div>

                                <div className="space-y-1">
                                    <h3 className={`font-bold text-lg ${isSelected ? 'text-indigo-600 dark:text-indigo-300' : ''}`}>
                                        {p.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground font-medium break-keep leading-relaxed">"{p.desc}"</p>
                                </div>

                                {isLocked && (
                                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="bg-black/80 text-white text-xs px-3 py-1.5 rounded-full font-bold">PRO 전용</span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </DialogContent>
        </Dialog>
    )
}
