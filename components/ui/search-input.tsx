"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch: (value: string) => void
}

export function SearchInput({ className, onSearch, ...props }: SearchInputProps) {
  const [value, setValue] = React.useState("")
  
  // Debounce logic
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value)
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  }, [value, onSearch])

  return (
    <div className={cn("relative group", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
      <Input
        type="search"
        placeholder="검색어를 입력하세요..."
        className={cn(
          "pl-10 h-12 rounded-full transition-all duration-300",
          "bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm",
          "border-2 border-transparent focus:border-primary/50",
          "shadow-sm focus:shadow-[0_0_20px_rgba(var(--primary),0.3)]", 
          "placeholder:text-muted-foreground/70"
        )}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        {...props}
      />
    </div>
  )
}
