import { motion } from 'framer-motion'
import { Loader2, AlertCircle, Inbox } from 'lucide-react'

interface LoadingStateProps {
    message?: string
}

export function LoadingState({ message = "Lade Daten..." }: LoadingStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-[400px] space-y-4"
            role="status"
            aria-live="polite"
        >
            <div className="relative">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    style={{
                        animation: '(prefers-reduced-motion: reduce) ? "none" : undefined' as any
                    }}
                >
                    <Loader2 className="h-12 w-12 text-green-500" />
                </motion.div>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-400">{message}</p>
        </motion.div>
    )
}

interface ErrorStateProps {
    message?: string
    onRetry?: () => void
}

export function ErrorState({ message = "Fehler beim Laden der Daten", onRetry }: ErrorStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[400px] space-y-4"
            role="alert"
        >
            <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
                <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Fehler</h3>
                <p className="text-gray-600 dark:text-gray-400">{message}</p>
            </div>
            {onRetry && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onRetry}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
                    aria-label="Erneut versuchen"
                >
                    Erneut versuchen
                </motion.button>
            )}
        </motion.div>
    )
}

interface EmptyStateProps {
    title?: string
    message?: string
    icon?: React.ComponentType<{ className?: string }>
}

export function EmptyState({
    title = "Keine Daten verfügbar",
    message = "Für diese Auswahl wurden keine Daten gefunden.",
    icon: Icon = Inbox
}: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[400px] space-y-4"
            role="status"
            aria-live="polite"
        >
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                <Icon className="h-12 w-12 text-gray-400 dark:text-gray-600" />
            </div>
            <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">{message}</p>
            </div>
        </motion.div>
    )
}
