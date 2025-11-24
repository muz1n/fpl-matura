import { ReactNode } from 'react'
import { Info } from 'lucide-react'

interface InfoBoxProps {
    children: ReactNode
    className?: string
    variant?: 'info' | 'warning' | 'success'
}

/**
 * Info-Box für Hinweistexte und Erklärungen.
 * Unterstützt verschiedene Varianten (info, warning, success).
 */
export function InfoBox({ children, className = '', variant = 'info' }: InfoBoxProps) {
    const variantStyles = {
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200',
        warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-200',
        success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-200',
    }

    return (
        <div className={`rounded-lg border p-4 ${variantStyles[variant]} ${className}`}>
            <div className="flex items-start gap-3">
                <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm leading-relaxed">
                    {children}
                </div>
            </div>
        </div>
    )
}
