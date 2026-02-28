'use client'

import { Background } from '@/components/background'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PostError({ reset }: { error: Error; reset: () => void }) {
    const router = useRouter()

    return (
        <div className="min-h-screen p-6 relative flex items-center justify-center">
            <Background />
            <div className="max-w-md text-center space-y-6 z-10">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold">글을 불러올 수 없습니다</h2>
                <p className="text-muted-foreground text-sm">요청하신 기록을 찾을 수 없거나 접근 권한이 없습니다.</p>
                <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => router.push('/blog')} className="rounded-full gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        목록으로
                    </Button>
                    <Button onClick={reset} className="rounded-full">
                        다시 시도
                    </Button>
                </div>
            </div>
        </div>
    )
}
