import { Background } from '@/components/background'
import { BrainCircuit, PenLine } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
    return (
        <main className="relative flex min-h-screen flex-col items-center justify-center p-6 text-center">
            <Background />

            <div className="z-10 max-w-2xl space-y-12">
                <div className="space-y-4">
                    <h1 className="text-5xl font-bold tracking-tighter sm:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400 dark:from-blue-400 dark:to-purple-200 animate-pulse">
                        Orbit
                    </h1>
                    <p className="text-xl text-muted-foreground dark:text-gray-300">
                        복잡한 마음을 정리하고, 나만의 궤도를 찾아가는 공간입니다.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {/* Quick Memo Card */}
                    <Link href="/memos">
                        <div className="group relative overflow-hidden rounded-2xl border bg-background/50 p-8 transition-all hover:scale-105 hover:bg-background/80 dark:hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-xl cursor-pointer h-full flex flex-col items-center justify-center gap-4">
                            <div className="rounded-full bg-blue-100 p-4 dark:bg-blue-900/30">
                                <PenLine className="h-8 w-8 text-blue-600 dark:text-blue-300" />
                            </div>
                            <h2 className="text-2xl font-bold">단상 (Moment)</h2>
                            <p className="text-sm text-muted-foreground">스쳐가는 생각과 영감을 가볍게 남겨보세요.</p>
                        </div>
                    </Link>

                    {/* Soul Blog Card */}
                    <Link href="/blog">
                        <div className="group relative overflow-hidden rounded-2xl border bg-background/50 p-8 transition-all hover:scale-105 hover:bg-background/80 dark:hover:shadow-[0_0_30px_rgba(244,114,182,0.3)] hover:shadow-xl cursor-pointer h-full flex flex-col items-center justify-center gap-4">
                            <div className="rounded-full bg-pink-100 p-4 dark:bg-pink-900/30">
                                <BrainCircuit className="h-8 w-8 text-pink-600 dark:text-pink-300" />
                            </div>
                            <h2 className="text-2xl font-bold">에세이 (Essay)</h2>
                            <p className="text-sm text-muted-foreground">AI의 새로운 시선과 함께, 나의 내면을 깊이 들여다보세요.</p>
                        </div>
                    </Link>
                </div>
            </div>
        </main>
    )
}
