import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export function PostSkeleton() {
    return (
        <Card className="p-6 bg-background/40 backdrop-blur-md border border-white/20 dark:border-white/5 shadow-sm">
            <div className="flex items-start gap-4">
                <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-6 w-2/3 max-w-[300px]" />
                        <div className="flex gap-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <div className="flex items-center gap-2 pt-1">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-3 rounded-full" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                </div>
            </div>
        </Card>
    )
}

export function MemoSkeleton() {
    return (
        <Card className="p-6 bg-background/40 backdrop-blur-md border border-white/20 dark:border-white/5 shadow-sm">
            <div className="flex gap-4">
                <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-center mb-2">
                        <Skeleton className="h-4 w-10" />
                    </div>
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-3 w-24 mt-2" />
                </div>
            </div>
        </Card>
    )
}

export function PostListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-6">
            {Array.from({ length: count }).map((_, i) => (
                <PostSkeleton key={i} />
            ))}
        </div>
    )
}

export function MemoListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <MemoSkeleton key={i} />
            ))}
        </div>
    )
}
