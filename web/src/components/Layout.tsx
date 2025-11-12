import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { Home, TrendingUp, Users, HelpCircle, BookOpen } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { cn } from '../../lib/utils'

interface LayoutProps {
    children: React.ReactNode
}

const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/predictions', label: 'Prognosen', icon: TrendingUp },
    { href: '/team', label: 'Team', icon: Users },
    { href: '/historisch', label: 'Historisch', icon: BookOpen },
    { href: '/glossary', label: 'Glossar', icon: BookOpen },
    { href: '/help', label: 'Hilfe', icon: HelpCircle },
]

export function Layout({ children }: LayoutProps) {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            {/* Skip Link */}
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 px-4 py-2 bg-emerald-600 text-white rounded shadow-lg">Zum Inhalt springen</a>
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        {/* Logo/Titel */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Link href="/" className="flex items-center space-x-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-blue-600">
                                    <span className="text-lg font-bold text-white">F</span>
                                </div>
                                <span className="text-xl font-bold text-gray-900 dark:text-white">
                                    FPL Assistent
                                </span>
                            </Link>
                        </motion.div>

                        {/* Navigation */}
                        <nav className="hidden md:flex items-center space-x-1">
                            {navItems.map((item, index) => {
                                const Icon = item.icon
                                const isActive = router.pathname === item.href

                                return (
                                    <motion.div
                                        key={item.href}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: index * 0.1 }}
                                    >
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors",
                                                isActive
                                                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white"
                                                , "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900")}
                                            aria-current={isActive ? 'page' : undefined}
                                        >
                                            <Icon className="h-5 w-5" />
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    </motion.div>
                                )
                            })}
                        </nav>

                        {/* Theme Toggle */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <ThemeToggle />
                        </motion.div>
                    </div>

                    {/* Mobile Navigation */}
                    <div className="md:hidden pb-3">
                        <nav className="flex items-center justify-around space-x-1">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = router.pathname === item.href

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors",
                                            isActive
                                                ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                            , "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900")}
                                        aria-current={isActive ? 'page' : undefined}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="text-xs font-medium">{item.label}</span>
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <motion.main
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="container mx-auto px-4 sm:px-6 lg:px-8 py-8"
                id="main-content"
                tabIndex={-1}
            >
                {children}
            </motion.main>

            {/* Footer */}
            <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 mt-auto">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                        <p>FPL Assistent © 2025 - Deine Hilfe für Fantasy Premier League</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
