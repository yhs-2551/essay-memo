import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

interface UseImageUploadResult {
    uploadImage: (file: File) => Promise<string | null>
    isUploading: boolean
    handlePaste: (e: React.ClipboardEvent) => Promise<string | null>
}

export const useImageUpload = (bucketName: string = 'user_uploads'): UseImageUploadResult => {
    const [isUploading, setIsUploading] = useState(false)
    const supabase = createClient()

    const uploadImage = useCallback(
        async (file: File): Promise<string | null> => {
            // Basic validation
            if (!file.type.startsWith('image/')) {
                toast.error('이미지 파일만 업로드 가능합니다.')
                return null
            }

            // Limit size to 5MB (Pro Limit)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('5MB 이하의 이미지만 업로드 가능합니다.')
                return null
            }

            setIsUploading(true)
            const toastId = toast.loading('이미지를 우주로 쏘아올리는 중...')

            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser()
                if (!user) {
                    toast.error('로그인이 필요합니다.')
                    return null
                }

                const fileExt = file.name.split('.').pop()
                const fileName = `${uuidv4()}.${fileExt}`
                const filePath = `${user.id}/${fileName}`

                const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file)

                if (uploadError) {
                    throw uploadError
                }

                const {
                    data: { publicUrl },
                } = supabase.storage.from(bucketName).getPublicUrl(filePath)

                toast.success('이미지가 궤도에 진입했습니다!', { id: toastId })
                return publicUrl
            } catch (error) {
                console.error('Image upload failed:', error)
                toast.error('이미지 업로드에 실패했습니다.', { id: toastId })
                return null
            } finally {
                setIsUploading(false)
            }
        },
        [bucketName, supabase]
    )

    const handlePaste = useCallback(
        async (e: React.ClipboardEvent): Promise<string | null> => {
            const items = e.clipboardData?.items
            if (!items) return null

            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile()
                    if (file) {
                        e.preventDefault() // Prevent default paste behavior if it's an image
                        return await uploadImage(file)
                    }
                }
            }
            return null
        },
        [uploadImage]
    )

    return {
        uploadImage,
        isUploading,
        handlePaste,
    }
}
