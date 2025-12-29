'use client'

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Background } from '@/components/background'
import { Card } from '@/components/ui/card'
import { Sparkles, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

function LoginContent() {
    const searchParams = useSearchParams()
    const next = searchParams.get('next') || '/'

    const handleLogin = async (provider: 'google' | 'kakao') => {
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
            },
        })

        if (error) {
            toast.error('로그인에 실패했습니다. 다시 시도해주세요.')
            console.error(error)
        }
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden">
            <Background />

            <div className="z-10 w-full max-w-md animate-in fade-in zoom-in-50 duration-500">
                <Link
                    href="/"
                    className="absolute top-8 left-8 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>메인으로</span>
                </Link>

                <Card className="p-8 border-gray-200/50 dark:border-white/10 bg-white/80 dark:bg-black/20 backdrop-blur-xl shadow-2xl">
                    <div className="flex flex-col items-center gap-6 text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 flex items-center justify-center mb-2">
                            <Sparkles className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Orbit 시작하기</h1>
                            <p className="text-sm text-gray-500 dark:text-muted-foreground">나만의 궤도를 찾아보세요.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Button
                            variant="outline"
                            className="w-full h-12 text-base font-medium relative group border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 bg-white dark:bg-transparent"
                            onClick={() => handleLogin('google')}
                        >
                            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Google로 계속하기
                        </Button>

                        <Button
                            className="w-full h-12 text-base font-medium bg-[#FEE500] hover:bg-[#FEE500]/90 text-black border-none"
                            onClick={() => handleLogin('kakao')}
                        >
                            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 3C5.9 3 1 6.9 1 11.8c0 2.9 1.8 5.6 4.8 7.1-.2.8-.7 2.9-.8 3.3 0 .3.2.5.5.3.3-.2 3.8-2.6 4.4-3 .7.1 1.4.2 2.1.2 6.1 0 11-3.9 11-8.8C23 6.9 18.1 3 12 3z" />
                            </svg>
                            Kakao로 계속하기
                        </Button>
                    </div>
                </Card>
            </div>
        </main>
    )
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <main className="flex min-h-screen flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </main>
            }
        >
            <LoginContent />
        </Suspense>
    )
}
