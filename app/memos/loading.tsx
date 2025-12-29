import { MemoListSkeleton } from '@/components/skeletons'
import { Background } from '@/components/background'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { ArrowLeft } from 'lucide-react'

export default function Loading() {
    return (
        <div className="min-h-screen p-6 pt-24 relative">
            <Background />
            <div className="max-w-md mx-auto space-y-6">
                <header className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="icon" disabled>
                            <ArrowLeft className="h-6 w-6 opacity-20" />
                        </Button>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-muted to-muted/50 animate-pulse">
                            단상 (Moment)
                        </h1>
                        <div className="w-10" />
                    </div>

                    <div className="bg-muted h-11 rounded-2xl animate-pulse w-full" />
                    <div className="bg-muted h-11 rounded-xl animate-pulse w-1/3" />
                </header>

                <div className="bg-muted h-24 rounded-2xl animate-pulse mb-8" />

                <div className="space-y-4 pb-20">
                    <MemoListSkeleton count={4} />
                </div>
            </div>
        </div>
    )
}
