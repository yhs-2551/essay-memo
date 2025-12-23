import { format, isToday, isYesterday, isSameYear } from "date-fns"
import { ko } from "date-fns/locale"

export type DateGroup = {
  label: string
  date: string // ISO string for sorting/key
  items: any[]
}

/**
 * Groups items by date sections (Today, Yesterday, Then by Month).
 * Optimized for readability and performance on the client side.
 * 
 * @param items Array of items containing a 'created_at' string
 * @returns Array of grouped sections
 */
export function groupItemsByDate<T extends { created_at: string }>(items: T[]): DateGroup[] {
  const groups: { [key: string]: T[] } = {}
  const groupOrder: string[] = [] // To maintain order

  items.forEach(item => {
    const date = new Date(item.created_at)
    let key = ""
    let label = ""

    if (isToday(date)) {
      key = "today"
      label = "오늘"
    } else if (isYesterday(date)) {
      key = "yesterday"
      label = "어제"
    } else {
      // Group by Month (e.g., 2024-10)
      key = format(date, "yyyy-MM")
      // Label: "2024년 10월" or just "10월" if current year? 
      // User wanted "2024년 10월" style for clarity.
      label = format(date, "yyyy년 M월", { locale: ko })
    }

    if (!groups[key]) {
      groups[key] = []
      groupOrder.push(key)
    }
    groups[key].push(item)
  })

  // Map to array
  return groupOrder.map(key => {
    let label = ""
    if (key === "today") label = "오늘"
    else if (key === "yesterday") label = "어제"
    else label = format(new Date(key), "yyyy년 M월", { locale: ko })

    return {
      label,
      date: key,
      items: groups[key]
    }
  })
}

/**
 * Extract available Year/Month options from items for the filter
 */
export function getAvailableDates<T extends { created_at: string }>(items: T[]) {
  const dates = new Set<string>()
  items.forEach(item => {
    const date = new Date(item.created_at)
    dates.add(format(date, "yyyy-MM"))
  })
  return Array.from(dates).sort().reverse().map(dateStr => {
    const [year, month] = dateStr.split("-")
    return { value: dateStr, label: `${year}년 ${parseInt(month)}월` }
  })
}
