import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useImageUpload } from '@/hooks/use-image-upload'
import { toast } from 'sonner'

// Mock dependencies
const mockSupabase = {
    auth: {
        getUser: vi.fn(),
    },
    storage: {
        from: vi.fn(),
    },
}

vi.mock('@/lib/supabase/client', () => ({
    createClient: vi.fn(() => mockSupabase),
}))

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        loading: vi.fn(),
        success: vi.fn(),
        dismiss: vi.fn(),
    },
}))

vi.mock('uuid', () => ({
    v4: vi.fn(() => 'mock-uuid'),
}))

describe('useImageUpload Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should return null and show error for non-image files', async () => {
        const { result } = renderHook(() => useImageUpload())
        const file = new File(['content'], 'test.txt', { type: 'text/plain' })

        let url
        await act(async () => {
            url = await result.current.uploadImage(file)
        })

        expect(url).toBeNull()
        expect(toast.error).toHaveBeenCalledWith('이미지 파일만 업로드 가능합니다.')
    })

    it('should return null and show error for files larger than 5MB', async () => {
        const { result } = renderHook(() => useImageUpload())
        const largeFile = new File(['a'.repeat(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })

        // Mock file.size because jsdom/node implementation might not set it correctly from string
        Object.defineProperty(largeFile, 'size', { value: 5 * 1024 * 1024 + 1 })

        let url
        await act(async () => {
            url = await result.current.uploadImage(largeFile)
        })

        expect(url).toBeNull()
        expect(toast.error).toHaveBeenCalledWith('5MB 이하의 이미지만 업로드 가능합니다.')
    })

    it('should return null and show error if user is not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' })

        const { result } = renderHook(() => useImageUpload())
        const file = new File(['content'], 'test.png', { type: 'image/png' })

        let url
        await act(async () => {
            url = await result.current.uploadImage(file)
        })

        expect(url).toBeNull()
        expect(toast.error).toHaveBeenCalledWith('로그인이 필요합니다.')
    })

    it('should upload image and return publicUrl on success', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

        const mockUpload = vi.fn().mockResolvedValue({ error: null })
        const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'http://supa.base/img.png' } })

        mockSupabase.storage.from.mockReturnValue({
            upload: mockUpload,
            getPublicUrl: mockGetPublicUrl,
        })

        const { result } = renderHook(() => useImageUpload())
        const file = new File(['content'], 'test.png', { type: 'image/png' })

        let url
        await act(async () => {
            url = await result.current.uploadImage(file)
        })

        expect(url).toBe('http://supa.base/img.png')
        expect(mockUpload).toHaveBeenCalledWith('user-1/mock-uuid.png', file)
        expect(toast.success).toHaveBeenCalled()
    })

    it('should handle upload error', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

        const mockUpload = vi.fn().mockResolvedValue({ error: { message: 'Upload failed' } })
        mockSupabase.storage.from.mockReturnValue({
            upload: mockUpload,
        })

        const { result } = renderHook(() => useImageUpload())
        const file = new File(['content'], 'test.png', { type: 'image/png' })

        let url
        await act(async () => {
            url = await result.current.uploadImage(file)
        })

        expect(url).toBeNull()
        expect(toast.error).toHaveBeenCalledWith('이미지 업로드에 실패했습니다.', expect.any(Object))
    })

    it('should handle paste event with image', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

        const mockUpload = vi.fn().mockResolvedValue({ error: null })
        const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'http://supa.base/pasted.png' } })

        mockSupabase.storage.from.mockReturnValue({
            upload: mockUpload,
            getPublicUrl: mockGetPublicUrl,
        })

        const { result } = renderHook(() => useImageUpload())

        // Mock ClipboardEvent
        const file = new File(['content'], 'pasted.png', { type: 'image/png' })
        const mockClipboardData = {
            items: [
                {
                    type: 'image/png',
                    getAsFile: () => file,
                },
            ],
        }
        const mockEvent = {
            clipboardData: mockClipboardData,
            preventDefault: vi.fn(),
        } as unknown as React.ClipboardEvent

        let url
        await act(async () => {
            url = await result.current.handlePaste(mockEvent)
        })

        expect(url).toBe('http://supa.base/pasted.png')
        expect(mockEvent.preventDefault).toHaveBeenCalled()
    })

    it('should ignore paste event without image', async () => {
        const { result } = renderHook(() => useImageUpload())

        const mockClipboardData = {
            items: [
                {
                    type: 'text/plain',
                    getAsFile: () => null,
                },
            ],
        }
        const mockEvent = {
            clipboardData: mockClipboardData,
            preventDefault: vi.fn(),
        } as unknown as React.ClipboardEvent

        let url
        await act(async () => {
            url = await result.current.handlePaste(mockEvent)
        })

        expect(url).toBeNull()
        expect(mockEvent.preventDefault).not.toHaveBeenCalled()
    })
})
