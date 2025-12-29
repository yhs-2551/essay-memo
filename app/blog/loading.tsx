import { PostListSkeleton } from '@/components/skeletons'
import { Background } from '@/components/background'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { ArrowLeft, Calendar, Plus } from 'lucide-react'

export default function Loading() {
    return (
        <div className="min-h-screen p-6 pt-24 relative">
            <Background />

            {/* Header Skeleton */}
            <div className="max-w-4xl mx-auto space-y-6">
                <header className="flex flex-col gap-8">
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="icon" disabled className="rounded-full">
                            <ArrowLeft className="h-6 w-6 opacity-20" />
                        </Button>
                        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-muted to-muted/50 tracking-tight animate-pulse">
                            에세이 (Essay)
                        </h1>
                        <Button variant="default" size="lg" disabled className="rounded-2xl opacity-50">
                            <Plus className="mr-2 h-5 w-5" /> 새 에세이
                        </Button>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="bg-muted h-11 rounded-2xl animate-pulse w-full" />
                        <div className="bg-muted h-11 rounded-xl animate-pulse w-[140px]" />
                    </div>
                </header>

                <div className="space-y-4 pb-32">
                    <PostListSkeleton count={3} />
                </div>
            </div>
        </div>
    )
}
