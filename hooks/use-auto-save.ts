"use client"

import { useState, useEffect, useCallback, useRef } from "react"

/**
 * Custom hook for auto-saving form data to localStorage.
 * 
 * @param key The unique key for localStorage (e.g., 'blog-new-draft')
 * @param initialData The data object to save
 * @param delay Debounce delay in milliseconds (default: 1000ms)
 * @returns { isSaving, lastSavedAt, clearDraft }
 */
export function useAutoSave<T>(key: string, data: T, delay: number = 1000) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  // Load initial data from storage
  // Note: We return a function to load data so the consumer can set their state
  const loadDraft = useCallback((): T | null => {
    if (typeof window === "undefined") return null
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.warn("Failed to load draft", e)
    }
    return null
  }, [key])

  const isMounted = useRef(false)
  const lastSerializedData = useRef(JSON.stringify(data))

  // Save data effect
  useEffect(() => {
    // Skip initial mount
    if (!isMounted.current) {
      isMounted.current = true
      return
    }

    const currentSerializedData = JSON.stringify(data)
    // Skip if data hasn't changed (deep comparison via stringify)
    if (currentSerializedData === lastSerializedData.current) return

    setIsSaving(true)
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, currentSerializedData)
        lastSerializedData.current = currentSerializedData
        setLastSavedAt(new Date())
        setIsSaving(false)
      } catch (e) {
        console.warn("Failed to auto-save", e)
        setIsSaving(false)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [key, data, delay])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key)
    setLastSavedAt(null)
  }, [key])

  return { isSaving, lastSavedAt, loadDraft, clearDraft }
}
