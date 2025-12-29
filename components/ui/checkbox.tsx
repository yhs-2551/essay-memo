'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const Checkbox = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement> & { checked?: boolean; onCheckedChange?: (checked: boolean) => void }
>(({ className, checked, onCheckedChange, ...props }, ref) => (
    <div
        className={cn(
            'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center cursor-pointer transition-colors',
            checked ? 'bg-primary text-primary-foreground' : 'bg-transparent',
            className
        )}
        onClick={() => onCheckedChange?.(!checked)}
    >
        {checked && <Check className="h-3 w-3" />}
        <input
            type="checkbox"
            ref={ref}
            className="sr-only"
            checked={checked}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            {...props}
        />
    </div>
))
Checkbox.displayName = 'Checkbox'

export { Checkbox }
