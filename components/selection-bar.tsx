'use client'

import { Button } from '@/components/ui/button'
import { Trash2, X, CheckSquare, Square } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SelectionBarProps {
    selectedCount: number
    totalCount: number
    onDelete: () => void
    onClear: () => void
    onSelectAll: () => void
}

export function SelectionBar({ selectedCount, totalCount, onDelete, onClear, onSelectAll }: SelectionBarProps) {
    if (selectedCount === 0) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 50, x: '-50%', opacity: 0 }}
                animate={{ y: 0, x: '-50%', opacity: 1 }}
                exit={{ y: 50, x: '-50%', opacity: 0 }}
                className="fixed bottom-10 left-1/2 z-50 w-[95%] max-w-md"
            >
                <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClear}
                            className="text-white hover:bg-white/10 rounded-full h-10 w-10"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        <span className="text-white font-semibold text-sm ml-1">{selectedCount}개</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onSelectAll}
                            className="text-white/70 hover:text-white hover:bg-white/10 text-xs"
                        >
                            {selectedCount === totalCount ? <CheckSquare className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}
                            전체 선택
                        </Button>
                        <div className="w-px h-4 bg-white/10 mx-1" />
                        <Button variant="destructive" size="sm" onClick={onDelete} className="bg-red-500 hover:bg-red-600 rounded-xl px-4">
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                        </Button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
