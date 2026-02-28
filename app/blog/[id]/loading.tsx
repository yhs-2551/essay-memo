import { Background } from '@/components/background'

export default function PostLoading() {
    return (
        <div className="min-h-screen p-6 relative flex items-center justify-center">
            <Background />
            <div className="max-w-4xl w-full mx-auto space-y-8 animate-pulse">
                <div className="flex justify-between items-center mb-12">
                    <div className="h-10 w-32 bg-muted/20 rounded-full" />
                    <div className="h-9 w-24 bg-muted/20 rounded-full" />
                </div>
                <div className="p-8 bg-background/40 backdrop-blur-md rounded-xl border border-white/10 h-[60vh]" />
            </div>
        </div>
    )
}
