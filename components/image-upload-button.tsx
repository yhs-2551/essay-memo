import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import { useImageUpload } from '@/hooks/use-image-upload'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { IMAGE_CONFIG } from '@/lib/constants'

interface ImageUploadButtonProps {
    onUploadComplete: (url: string) => void
    bucketName?: string
    className?: string
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    size?: 'default' | 'sm' | 'lg' | 'icon'
    label?: string
    disabled?: boolean
    // Total size tracking (optional)
    currentTotalBytes?: number
    maxTotalBytes?: number
}

export function ImageUploadButton({
    onUploadComplete,
    bucketName = 'user_uploads',
    className,
    variant = 'ghost',
    size = 'icon',
    label = '이미지 첨부',
    disabled = false,
    currentTotalBytes = 0,
    maxTotalBytes,
}: ImageUploadButtonProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { uploadImage, isUploading } = useImageUpload(bucketName)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Guard: Check per-file size limit
        if (file.size > IMAGE_CONFIG.MAX_FILE_SIZE_BYTES) {
            toast.error(`이미지당 최대 ${IMAGE_CONFIG.MAX_FILE_SIZE_MB}MB까지 업로드 가능합니다.`)
            return
        }

        // Guard: Check total size limit (only if maxTotalBytes is provided)
        if (maxTotalBytes && currentTotalBytes + file.size > maxTotalBytes) {
            const maxTotalMB = Math.round(maxTotalBytes / (1024 * 1024))
            toast.error(`총 이미지 용량이 ${maxTotalMB}MB를 초과합니다.`)
            return
        }

        const url = await uploadImage(file)
        if (url) {
            onUploadComplete(url)
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const triggerUpload = () => {
        if (disabled) return
        fileInputRef.current?.click()
    }

    return (
        <TooltipProvider>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading || disabled}
            />
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant={variant}
                        size={size}
                        className={cn(
                            'rounded-full transition-all duration-300 hover:scale-105 active:scale-95',
                            'bg-background/50 backdrop-blur-sm border border-border/50 hover:bg-background/80 hover:border-primary/50',
                            className
                        )}
                        onClick={triggerUpload}
                        disabled={isUploading || disabled}
                    >
                        {isUploading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                            <Plus className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                        )}
                        <span className="sr-only">{label}</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                    <p className="text-xs">{label}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
