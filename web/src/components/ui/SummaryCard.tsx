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
        <div className={`bg-slate-800/90 border border-slate-700 rounded-lg shadow-sm p-4 ${className}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs text-slate-400">{title}</p>
                    <p className="mt-2 text-xl font-semibold text-slate-100">{value}</p>
                    {subtitle && (
                        <p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>
                    )}
                </div>
                {icon && (
                    <div className="text-emerald-400">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    )
}
