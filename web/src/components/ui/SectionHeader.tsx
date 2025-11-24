import { ReactNode } from 'react'

interface SectionHeaderProps {
    title: string
    subtitle?: string
    action?: ReactNode
    className?: string
}

/**
 * Section-Header mit Titel, optionalem Untertitel und Action-Bereich (z.B. Button).
 */
export function SectionHeader({ title, subtitle, action, className = '' }: SectionHeaderProps) {
    return (
        <div className={`flex items-start justify-between ${className}`}>
            <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
                {subtitle && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
                )}
            </div>
            {action && (
                <div className="ml-4">
                    {action}
                </div>
            )}
        </div>
    )
}
