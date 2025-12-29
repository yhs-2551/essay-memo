'use client'

import { cn } from '@/lib/utils'

interface StickyHeaderProps {
    children: React.ReactNode
    className?: string
}

export function StickyHeader({ children, className }: StickyHeaderProps) {
    return (
        <div
            className={cn(
                // Layout
                'sticky top-0 z-10 py-2 mb-4',
                // Visuals: Glassmorphism for depth and readability
                'bg-background/80 backdrop-blur-md',
                // Border for separation (subtle)
                'border-b border-border/40',
                // Typography
                'text-sm font-semibold text-muted-foreground',
                // Animation (optional entry)
                'animate-in fade-in slide-in-from-top-1',
                className
            )}
        >
            {children}
        </div>
    )
}
