import { Background } from '@/components/background'
import { Stars } from 'lucide-react'

export default function EditLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <Background />
            <div className="text-center animate-pulse">
                <Stars className="h-10 w-10 mx-auto mb-4 text-purple-500" />
                <p className="text-muted-foreground">기록을 불러오는 중...</p>
            </div>
        </div>
    )
}
