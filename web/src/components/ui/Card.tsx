import { ReactNode } from 'react'

interface CardProps {
    children: ReactNode
    className?: string
}

/**
 * Basis-Card-Komponente mit subtiler Hintergrundfarbe und Padding.
 * Unterstützt Dark/Light Mode automatisch.
 */
export function Card({ children, className = '' }: CardProps) {
    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
            {children}
        </div>
    )
}
