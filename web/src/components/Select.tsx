import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

interface SelectProps {
    label: string
    value: string | number
    onChange: (value: string) => void
    options: { value: string | number; label: string }[]
    tooltip?: React.ReactNode
    className?: string
    disabled?: boolean
}

export function Select({ label, value, onChange, options, tooltip, className, disabled }: SelectProps) {
    const id = React.useId?.() || `${label.replace(/\s+/g, '_')}_select`
    return (
        <div className={cn("relative", className)}>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 inline-flex items-center">
                {label}
                {tooltip && <span className="ml-1">{tooltip}</span>}
            </label>
            <div className="relative">
                <select
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    aria-label={label}
                    disabled={!!disabled}
                    className={cn(
                        "block w-full px-4 py-2.5 pr-10 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 focus:border-transparent appearance-none cursor-pointer transition-colors",
                        disabled ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" : ""
                    )}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400">
                    <ChevronDown className="h-5 w-5" />
                </div>
            </div>
        </div>
    )
}
