"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles } from 'lucide-react'

interface OnboardingBannerProps {
    storageKey?: string
}

export function OnboardingBanner({ storageKey = 'fpl-onboarding-seen' }: OnboardingBannerProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        // Prüfe ob Onboarding bereits gesehen wurde
        const seen = localStorage.getItem(storageKey)
        if (!seen) {
            setIsVisible(true)
        }
    }, [storageKey])

    const handleDismiss = () => {
        setIsVisible(false)
        localStorage.setItem(storageKey, 'true')
    }

    if (!mounted) {
        return null
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="relative mb-6 p-6 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg shadow-lg text-white overflow-hidden"
                >
                    {/* Hintergrund-Dekoration */}
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />

                    <div className="relative flex items-start justify-between">
                        <div className="flex-1 pr-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Sparkles className="h-6 w-6" />
                                <h3 className="text-xl font-bold">
                                    Willkommen beim FPL Assistenten!
                                </h3>
                            </div>
                            <p className="text-white/90 leading-relaxed">
                                Diese App hilft dir, bessere Entscheidungen für dein Fantasy Premier League Team zu treffen.
                                Nutze KI-gestützte Prognosen, um die besten Spieler zu finden und deine Aufstellung zu optimieren.
                            </p>
                        </div>

                        <button
                            onClick={handleDismiss}
                            className="flex-shrink-0 p-2 hover:bg-white/20 rounded-lg transition-colors"
                            aria-label="Schließen"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
