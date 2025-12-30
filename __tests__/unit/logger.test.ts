import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logActivity } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

// Mock dependencies
vi.mock('@/lib/supabase/server')
vi.mock('next/headers')

describe('logger', () => {
    const mockSupabase = {
        auth: {
            getUser: vi.fn(),
        },
        from: vi.fn(),
    }

    const mockInsert = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(headers).mockResolvedValue({
            get: vi.fn((key: string) => {
                if (key === 'x-forwarded-for') return '123.456.789.0'
                if (key === 'user-agent') return 'Mozilla/5.0 Test Browser'
                return null
            }),
        } as any)

        mockSupabase.from.mockReturnValue({
            insert: mockInsert.mockResolvedValue({ error: null }),
        } as any)
    })

    it('기본 활동 로그 기록', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user-123' } },
        })

        await logActivity('POST_CREATE', { postId: 'post-1' })

        expect(mockInsert).toHaveBeenCalledWith({
            user_id: 'user-123',
            action_type: 'POST_CREATE',
            metadata: { postId: 'post-1' },
            ip_address: '123.456.789.0',
            user_agent: 'Mozilla/5.0 Test Browser',
        })
    })

    it('userId 명시적으로 전달', async () => {
        await logActivity('USER_LOGIN', {}, 'explicit-user-456')

        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'explicit-user-456',
            })
        )
    })

    it('IP 주소 다중 값 처리 (첫 번째만 추출)', async () => {
        vi.mocked(headers).mockResolvedValue({
            get: vi.fn((key: string) => {
                if (key === 'x-forwarded-for') return '192.168.1.1, 10.0.0.1, 172.16.0.1'
                return null
            }),
        } as any)

        await logActivity('POST_CREATE', {})

        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                ip_address: '192.168.1.1',
            })
        )
    })

    it('x-real-ip 헤더 폴백', async () => {
        vi.mocked(headers).mockResolvedValue({
            get: vi.fn((key: string) => {
                if (key === 'x-real-ip') return '8.8.8.8'
                return null
            }),
        } as any)

        await logActivity('MEMO_CREATE', {})

        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                ip_address: '8.8.8.8',
            })
        )
    })

    it('로그인하지 않은 사용자 (user_id = null)', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
        })

        await logActivity('USER_LOGOUT', {})

        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: null,
            })
        )
    })

    it('빈 메타데이터 처리', async () => {
        await logActivity('AI_ANALYSIS')

        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                metadata: {},
            })
        )
    })

    it('로깅 실패 시 에러 던지지 않음 (Fire and Forget)', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        mockInsert.mockRejectedValue(new Error('DB 오류'))

        // 에러가 throw 되지 않아야 함
        await expect(logActivity('POST_CREATE', {})).resolves.not.toThrow()

        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to log activity:', expect.any(Error))
        consoleErrorSpy.mockRestore()
    })

    it('다양한 액션 타입 지원', async () => {
        const actions = [
            'USER_LOGIN',
            'USER_LOGOUT',
            'POST_CREATE',
            'POST_UPDATE',
            'POST_DELETE',
            'MEMO_CREATE',
            'MEMO_DELETE',
            'AI_ANALYSIS',
        ] as const

        for (const action of actions) {
            await logActivity(action, {})
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    action_type: action,
                })
            )
        }
    })
})
