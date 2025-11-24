import { ReactNode } from 'react'
import { Card } from './Card'

interface ControlPanelProps {
    children: ReactNode
    className?: string
}

/**
 * Control-Panel für Filter und Eingabefelder.
 * Wrapper um Card mit speziellem Styling für Controls.
 */
export function ControlPanel({ children, className = '' }: ControlPanelProps) {
    return (
        <Card className={`${className}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {children}
            </div>
        </Card>
    )
}
