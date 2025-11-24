import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { Navbar } from './Navbar'
import { cn } from '../../lib/utils'

interface LayoutProps {
    children: React.ReactNode
}

// ...existing code...

export function Layout({ children }: LayoutProps) {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            {/* Skip Link */}
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 px-4 py-2 bg-emerald-600 text-white rounded shadow-lg">Zum Inhalt springen</a>
            {/* Neue Navigation */}
            <Navbar />

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 space-y-6 mt-6" id="main-content" tabIndex={-1}>
                {children}
            </main>

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
