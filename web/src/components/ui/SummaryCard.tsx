import { ReactNode } from 'react'

interface SummaryCardProps {
    title: string
    value: string | number
    subtitle?: string
    icon?: ReactNode
    className?: string
}

/**
 * Kleine Summary-Card für Kennzahlen.
 * Zeigt Titel, grossen Wert und optionalen Untertitel.
 */
export function SummaryCard({ title, value, subtitle, icon, className = '' }: SummaryCardProps) {
    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
                    {subtitle && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
                    )}
                </div>
                {icon && (
                    <div className="text-gray-400 dark:text-gray-500">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    )
}
