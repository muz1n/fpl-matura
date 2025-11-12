"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { motion } from "framer-motion"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse" />
        )
    }

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
            aria-label="Theme wechseln"
        >
            <motion.div
                initial={false}
                animate={{ rotate: theme === "dark" ? 0 : 180, opacity: theme === "dark" ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="absolute"
            >
                <Moon className="h-5 w-5 text-gray-800 dark:text-gray-200" />
            </motion.div>
            <motion.div
                initial={false}
                animate={{ rotate: theme === "light" ? 0 : -180, opacity: theme === "light" ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="absolute"
            >
                <Sun className="h-5 w-5 text-gray-800 dark:text-gray-200" />
            </motion.div>
        </motion.button>
    )
}
