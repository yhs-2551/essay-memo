import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAutoSave } from '@/hooks/use-auto-save'
import { createClient } from '@/lib/supabase/client'
import { l1Storage } from '@/utils/indexed-db'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('@/lib/supabase/client')
vi.mock('@/utils/indexed-db')
vi.mock('sonner')

describe('use-auto-save Integration Tests', () => {
    const mockSupabase = {
        auth: {
            getUser: vi.fn(),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } },
            })),
        },
        from: vi.fn(() => ({
            upsert: vi.fn(),
            select: vi.fn(),
            delete: vi.fn(),
        })),
    }

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(createClient).mockReturnValue(mockSupabase as any)
        vi.mocked(l1Storage.set).mockResolvedValue(undefined)
        vi.mocked(l1Storage.get).mockResolvedValue(null)
        vi.mocked(l1Storage.remove).mockResolvedValue(undefined)
    })

    afterEach(() => {
        vi.clearAllTimers()
    })

    describe('저장 기능', () => {
        it('데이터 변경 시 로컬(L1)에 자동 저장', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'user-123' } },
            })

            const testData = { title: '테스트', content: '내용' }

            renderHook(() => useAutoSave('test-key', testData, 500))

            await vi.waitFor(
                () => {
                    expect(l1Storage.set).toHaveBeenCalledWith(
                        'user_user-123:test-key',
                        expect.objectContaining({
                            data: testData,
                            version: 2,
                        })
                    )
                },
                { timeout: 1000 }
            )
        })

        it('디바운싱: 빠른 연속 변경은 마지막 값만 서버에 저장', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'user-123' } },
            })

            const upsertMock = vi.fn().mockResolvedValue({ error: null })
            mockSupabase.from.mockReturnValue({
                upsert: upsertMock,
                select: vi.fn(),
                delete: vi.fn(),
            } as any)

            const { rerender } = renderHook(({ data }) => useAutoSave('test-key', data, 500), {
                initialProps: { data: { title: 'v1' } },
            })

            rerender({ data: { title: 'v2' } })
            rerender({ data: { title: 'v3' } })

            await vi.waitFor(
                () => {
                    expect(upsertMock).toHaveBeenCalledTimes(1)
                    expect(upsertMock).toHaveBeenCalledWith(
                        expect.objectContaining({
                            data: { title: 'v3' },
                        }),
                        expect.any(Object)
                    )
                },
                { timeout: 1500 }
            )
        })

        it('게스트 사용자는 로컬만 저장 (서버 저장 안 함)', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
            })

            const testData = { title: '게스트 글' }

            const { result } = renderHook(() => useAutoSave('test-key', testData, 500))

            await vi.waitFor(
                () => {
                    expect(result.current.syncStatus).toBe('local-only')
                },
                { timeout: 1000 }
            )

            expect(l1Storage.set).toHaveBeenCalledWith('guest:test-key', expect.any(Object))
        })
    })

    describe('복원 기능', () => {
        it.skip('로컬 드래프트 복원', async () => {
            // TODO: Fix mock setup
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'user-123' } },
            })

            const localDraft = {
                data: { title: '로컬 드래프트' },
                timestamp: Date.now(),
                version: 2,
            }

            vi.mocked(l1Storage.get).mockResolvedValue(localDraft)

            const { result } = renderHook(() => useAutoSave('test-key', {}, 500))

            const loaded = await result.current.loadDraft()

            expect(loaded).toEqual({ title: '로컬 드래프트' })
        })

        it('서버 드래프트 복원 (로컬 없을 때)', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'user-123' } },
            })

            vi.mocked(l1Storage.get).mockResolvedValue(null)

            const serverDraft = {
                data: { title: '서버 드래프트' },
                updated_at: new Date().toISOString(),
            }

            const singleMock = vi.fn().mockResolvedValue({ data: serverDraft })
            mockSupabase.from.mockReturnValue({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: singleMock,
                        })),
                    })),
                })),
            } as any)

            const { result } = renderHook(() => useAutoSave('test-key', {}, 500))

            await vi.waitFor(async () => {
                const loaded = await result.current.loadDraft()
                expect(loaded).toEqual({ title: '서버 드래프트' })
            })
        })

        it.skip('레거시 드래프트 마이그레이션 (IndexedDB 구버전)', async () => {
            // TODO: Fix mock setup
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'user-123' } },
            })

            const legacyDraft = {
                data: { title: '레거시 드래프트' },
                timestamp: Date.now(),
            }

            vi.mocked(l1Storage.get)
                .mockResolvedValueOnce(null) // 신규 key 없음
                .mockResolvedValueOnce(legacyDraft) // 레거시 key 있음

            const { result } = renderHook(() => useAutoSave('test-key', {}, 500))

            const loaded = await result.current.loadDraft()

            expect(loaded).toEqual({ title: '레거시 드래프트' })
            expect(l1Storage.set).toHaveBeenCalledWith('user_user-123:test-key', legacyDraft)
            expect(l1Storage.remove).toHaveBeenCalledWith('test-key')
        })
    })

    describe('충돌 해결', () => {
        it.skip('서버가 더 최신이면 서버 우선 (1초 이상 차이)', async () => {
            // TODO: Fix mock setup
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'user-123' } },
            })

            const oldTimestamp = Date.now() - 5000 // 5초 전
            const newTimestamp = Date.now()

            vi.mocked(l1Storage.get).mockResolvedValue({
                data: { title: '로컬 구버전' },
                timestamp: oldTimestamp,
                version: 2,
            })

            const serverDraft = {
                data: { title: '서버 신버전' },
                updated_at: new Date(newTimestamp).toISOString(),
            }

            const singleMock = vi.fn().mockResolvedValue({ data: serverDraft })
            mockSupabase.from.mockReturnValue({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: singleMock,
                        })),
                    })),
                })),
            } as any)

            const { result } = renderHook(() => useAutoSave('test-key', {}, 500))

            const loaded = await result.current.loadDraft()

            expect(loaded).toEqual({ title: '서버 신버전' })
            expect(toast.info).toHaveBeenCalledWith('다른 기기에서 작성된 최신 글을 불러왔습니다.')
        })

        it.skip('로컬이 더 최신이면 로컬 우선', async () => {
            // TODO: Fix mock setup
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'user-123' } },
            })

            const newTimestamp = Date.now()
            const oldTimestamp = Date.now() - 5000

            vi.mocked(l1Storage.get).mockResolvedValue({
                data: { title: '로컬 신버전' },
                timestamp: newTimestamp,
                version: 2,
            })

            const serverDraft = {
                data: { title: '서버 구버전' },
                updated_at: new Date(oldTimestamp).toISOString(),
            }

            const singleMock = vi.fn().mockResolvedValue({ data: serverDraft })
            mockSupabase.from.mockReturnValue({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: singleMock,
                        })),
                    })),
                })),
            } as any)

            const { result } = renderHook(() => useAutoSave('test-key', {}, 500))

            const loaded = await result.current.loadDraft()

            expect(loaded).toEqual({ title: '로컬 신버전' })
        })

        it('충돌 시 의미있는 로컬 데이터만 토스트 표시', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'user-123' } },
            })

            // 짧은 로컬 데이터 (50자 이하)
            vi.mocked(l1Storage.get).mockResolvedValue({
                data: { title: 'a' }, // JSON: {"title":"a"} → 13자
                timestamp: Date.now() - 5000,
                version: 2,
            })

            const serverDraft = {
                data: { title: '서버' },
                updated_at: new Date().toISOString(),
            }

            const singleMock = vi.fn().mockResolvedValue({ data: serverDraft })
            mockSupabase.from.mockReturnValue({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: singleMock,
                        })),
                    })),
                })),
            } as any)

            const { result } = renderHook(() => useAutoSave('test-key', {}, 500))

            await result.current.loadDraft()

            expect(toast.info).not.toHaveBeenCalled()
        })
    })

    describe('드래프트 삭제', () => {
        it.skip('로컬 및 서버 드래프트 모두 삭제', async () => {
            // TODO: Fix mock setup
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'user-123' } },
            })

            const deleteMock = vi.fn().mockResolvedValue({ error: null })
            mockSupabase.from.mockReturnValue({
                delete: vi.fn(() => ({
                    match: deleteMock,
                })),
            } as any)

            const { result } = renderHook(() => useAutoSave('test-key', {}, 500))

            await vi.waitFor(() => {
                expect(result.current.clearDraft).toBeDefined()
            })

            await result.current.clearDraft()

            expect(l1Storage.remove).toHaveBeenCalledWith('user_user-123:test-key')
            expect(l1Storage.remove).toHaveBeenCalledWith('test-key') // 레거시 cleanup
            expect(deleteMock).toHaveBeenCalledWith({ user_id: 'user-123', key: 'test-key' })
        })
    })

    describe('에러 처리', () => {
        it('서버 저장 실패 시 에러 상태 및 토스트', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'user-123' } },
            })

            const upsertMock = vi.fn().mockResolvedValue({ error: { message: 'DB 오류' } })
            mockSupabase.from.mockReturnValue({
                upsert: upsertMock,
            } as any)

            const { result } = renderHook(() => useAutoSave('test-key', { title: 'test' }, 500))

            await vi.waitFor(
                () => {
                    expect(result.current.syncStatus).toBe('error')
                    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('DB 오류'))
                },
                { timeout: 1500 }
            )
        })

        it.skip('서버 타임아웃 시 타임아웃 메시지 표시', async () => {
            // TODO: Fix timeout handling
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'user-123' } },
            })

            const upsertMock = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 15000))) // 15초 대기
            mockSupabase.from.mockReturnValue({
                upsert: upsertMock,
            } as any)

            const { result } = renderHook(() => useAutoSave('test-key', { title: 'test' }, 500))

            await vi.waitFor(
                () => {
                    expect(toast.error).toHaveBeenCalledWith('서버 응답 지연: 로컬에 안전하게 저장됨')
                },
                { timeout: 12000 }
            )
        })
    })
})
