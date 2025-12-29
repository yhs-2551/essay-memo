'use client'

import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import Image from 'next/image'
import { Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ZoomableImageProps {
    src: string
    alt: string
    className?: string
    aspectRatio?: 'square' | 'video' | 'auto'
}

export function ZoomableImage({ src, alt, className, aspectRatio = 'square' }: ZoomableImageProps) {
    return (
        <div
            className={cn(
                'relative group cursor-zoom-in overflow-hidden rounded-xl border border-border/50 bg-muted/30 shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-primary/20',
                aspectRatio === 'square' && 'aspect-square',
                aspectRatio === 'video' && 'aspect-video',
                className
            )}
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
            }}
        >
            <Dialog>
                <DialogTrigger asChild>
                    <div className="w-full h-full relative">
                        <Image
                            src={src}
                            alt={alt}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                            <Maximize2 className="text-white w-6 h-6 shadow-lg drop-shadow-md" />
                        </div>
                    </div>
                </DialogTrigger>
                <DialogContent className="max-w-5xl w-full p-0 overflow-hidden bg-transparent border-none shadow-2xl focus:outline-none">
                    <DialogTitle className="sr-only">{alt}</DialogTitle>
                    <div className="relative w-full h-[85vh] flex items-center justify-center pointer-events-none">
                        <div className="relative w-full h-full pointer-events-auto">
                            <Image src={src} alt={alt} fill className="object-contain" sizes="95vw" priority />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
