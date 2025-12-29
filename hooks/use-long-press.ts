'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * useLongPress Hook
 * Handles long press gestures for mobile/tablet and right-click for desktop.
 * Centered on providing a consistent "entry to selection mode" experience.
 */
export function useLongPress(callback: () => void, ms = 500) {
    const [startLongPress, setStartLongPress] = useState(false)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    const start = useCallback(() => {
        setStartLongPress(true)
    }, [])

    const stop = useCallback(() => {
        setStartLongPress(false)
        if (timerRef.current) clearTimeout(timerRef.current)
    }, [])

    useEffect(() => {
        if (startLongPress) {
            timerRef.current = setTimeout(() => {
                callback()
                setStartLongPress(false)
            }, ms)
        } else {
            if (timerRef.current) clearTimeout(timerRef.current)
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [callback, ms, startLongPress])

    return {
        onMouseDown: start,
        onMouseUp: stop,
        onMouseLeave: stop,
        onTouchStart: start,
        onTouchEnd: stop,
        onContextMenu: (e: React.MouseEvent) => {
            e.preventDefault()
            callback()
        },
    }
}
