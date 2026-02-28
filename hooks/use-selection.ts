'use client'

import { useState } from 'react'

export function useSelection<T extends { id: string }>(items: T[]) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const selectAll = () => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(items.map((i) => i.id)))
        }
    }

    const clearSelection = () => {
        setSelectedIds(new Set())
    }

    return {
        selectedIds,
        toggleSelect,
        selectAll,
        clearSelection,
        isSelected: (id: string) => selectedIds.has(id),
    }
}
