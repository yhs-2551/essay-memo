import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    actionLabel?: string
    onAction?: () => void
    className?: string
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className = '' }: EmptyStateProps) {
    return (
        <Card
            className={`flex flex-col items-center justify-center p-10 bg-background/30 backdrop-blur-sm border-dashed border-2 border-muted/50 text-center animate-in fade-in zoom-in-95 duration-500 ${className}`}
        >
            <div className="w-16 h-16 rounded-3xl bg-primary/5 flex items-center justify-center mb-6 shadow-lg shadow-primary/5 ring-1 ring-primary/10">
                <Icon className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="text-xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                {title}
            </h3>
            <p className="text-sm text-muted-foreground/80 max-w-sm mb-8 leading-relaxed">{description}</p>
            {actionLabel && onAction && (
                <Button
                    onClick={onAction}
                    variant="outline"
                    className="rounded-full px-6 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all hover:scale-105 active:scale-95"
                >
                    {actionLabel}
                </Button>
            )}
        </Card>
    )
}
