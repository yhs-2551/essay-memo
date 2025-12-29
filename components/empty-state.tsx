import { LucideIcon, Sparkles as SparkleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    actionLabel?: string
    onAction?: () => void
    className?: string
}

/**
 * EmptyState - 우주 최고 UX/UI 디자이너 관점의 빈 상태 컴포넌트
 *
 * @rules 기반 설계:
 * - 사용자의 무의식까지 배려하는 디테일과 심미성
 * - 감동을 주는 경험 (Modal 대신 자연스럽게 녹아드는 디자인)
 * - 의식 개선 목표: "비어있음"이 아닌 "시작의 기회"로 인식
 */
export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className = '' }: EmptyStateProps) {
    return (
        <div
            className={`
                relative flex flex-col items-center justify-center py-16 px-6
                animate-in fade-in-0 slide-in-from-bottom-4 duration-700
                ${className}
            `}
        >
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-gradient-radial from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl" />
                <div
                    className="absolute top-1/3 left-1/3 w-2 h-2 bg-primary/30 rounded-full animate-pulse"
                    style={{ animationDelay: '0s' }}
                />
                <div
                    className="absolute top-1/4 right-1/3 w-1.5 h-1.5 bg-purple-400/40 rounded-full animate-pulse"
                    style={{ animationDelay: '0.5s' }}
                />
                <div
                    className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-indigo-400/50 rounded-full animate-pulse"
                    style={{ animationDelay: '1s' }}
                />
            </div>

            {/* Icon Container with Orbital Animation */}
            <div className="relative mb-8 group">
                {/* Outer Orbit Ring */}
                <div className="absolute -inset-4 rounded-full border border-dashed border-primary/20 animate-[spin_20s_linear_infinite]" />

                {/* Inner Glow */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 via-purple-500/10 to-indigo-500/10 blur-xl group-hover:scale-110 transition-transform duration-500" />

                {/* Icon Container */}
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl flex items-center justify-center shadow-2xl shadow-primary/10 ring-1 ring-white/10 group-hover:scale-105 transition-all duration-300">
                    <Icon className="w-10 h-10 text-primary/70 group-hover:text-primary transition-colors duration-300" />
                </div>

                {/* Floating Sparkle */}
                <SparkleIcon
                    className="absolute -top-1 -right-1 w-5 h-5 text-yellow-400/60 animate-bounce"
                    style={{ animationDuration: '2s' }}
                />
            </div>

            {/* Text Content */}
            <h3 className="text-2xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 tracking-tight">
                {title}
            </h3>
            <p className="text-sm text-muted-foreground/70 max-w-xs text-center leading-relaxed mb-6">{description}</p>

            {/* Action Button (Only if provided) */}
            {actionLabel && onAction && (
                <Button
                    onClick={onAction}
                    variant="ghost"
                    className="
                        relative overflow-hidden rounded-full px-8 py-3 h-auto
                        bg-gradient-to-r from-primary/10 via-purple-500/10 to-indigo-500/10
                        hover:from-primary/20 hover:via-purple-500/20 hover:to-indigo-500/20
                        border border-primary/20 hover:border-primary/40
                        text-primary font-medium
                        transition-all duration-300 hover:scale-105 active:scale-95
                        shadow-lg shadow-primary/5 hover:shadow-primary/15
                    "
                >
                    <span className="relative z-10">{actionLabel}</span>
                </Button>
            )}

            {/* Subtle Bottom Gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background/50 to-transparent pointer-events-none" />
        </div>
    )
}
