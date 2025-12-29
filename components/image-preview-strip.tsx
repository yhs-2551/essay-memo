'use client'

import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { Maximize2, X } from 'lucide-react'

import Image from 'next/image'

interface ImagePreviewStripProps {
    urls: string[]
    onRemove?: (url: string) => void
    showRemove?: boolean
}

/**
 * ImagePreviewStrip Component
 * Displays an array of image URLs as a horizontal scrollable row.
 * Perfect for editor previews.
 */
export function ImagePreviewStrip({ urls, onRemove, showRemove = false }: ImagePreviewStripProps) {
    if (urls.length === 0) return null

    return (
        <div className="flex gap-3 overflow-x-auto py-2 px-1 no-scrollbar animate-in fade-in slide-in-from-bottom-2 duration-500">
            {urls.map((url, index) => {
                const alt = '이미지'

                return (
                    <div key={`${url}-${index}`} className="relative group flex-shrink-0">
                        <Dialog>
                            <DialogTrigger asChild>
                                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/20 bg-background/40 backdrop-blur-sm cursor-zoom-in transition-all hover:scale-105 hover:shadow-lg shadow-indigo-500/20">
                                    <Image src={url} alt={alt} fill className="object-cover" sizes="80px" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                                        <Maximize2 className="text-white w-4 h-4" />
                                    </div>
                                </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-2xl">
                                <DialogTitle className="sr-only">이미지 크게 보기</DialogTitle>
                                <div className="relative w-full h-[80vh]">
                                    <Image src={url} alt={alt} fill className="object-contain" sizes="90vw" />
                                </div>
                            </DialogContent>
                        </Dialog>

                        {showRemove && onRemove && (
                            <button
                                onClick={() => onRemove(url)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 duration-200"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
