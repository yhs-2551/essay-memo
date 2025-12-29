'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Sparkles, Save, X } from 'lucide-react'

interface EditModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (data: { title?: string; content: string }) => Promise<void>
    initialData: { title?: string; content: string }
    type: 'memo' | 'post'
}

export function EditModal({ isOpen, onClose, onSave, initialData, type }: EditModalProps) {
    const [content, setContent] = useState(initialData.content)
    const [title, setTitle] = useState(initialData.title || '')
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        try {
            await onSave(type === 'post' ? { title, content } : { content })
            onClose()
        } catch (error) {
            console.error('Save error:', error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] h-[90vh] sm:h-auto overflow-hidden flex flex-col p-0 bg-background/80 backdrop-blur-xl border-white/20 shadow-2xl">
                <DialogHeader className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Sparkles className="h-5 w-5 text-blue-400" />
                        기억 수정하기
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {type === 'post' && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">제목</label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="어떤 이야기를 담아볼까요?"
                                className="bg-white/5 border-white/10 focus:border-blue-500/50 text-lg transition-all"
                            />
                        </div>
                    )}
                    <div className="space-y-2 flex-1 flex flex-col min-h-[300px]">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">내용</label>
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="당신의 생각을 자유롭게 적어보세요..."
                            className="flex-1 bg-white/5 border-white/10 focus:border-purple-500/50 resize-none leading-relaxed text-base transition-all p-4 rounded-2xl"
                        />
                    </div>
                </div>

                <div className="p-6 bg-white/5 border-t border-white/10 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={saving} className="rounded-xl hover:bg-white/10">
                        취소
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !content.trim()}
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-purple-500/20 px-8"
                    >
                        {saving ? (
                            <span className="animate-pulse">심는 중...</span>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                저장하기
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
