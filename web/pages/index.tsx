import Head from 'next/head'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { TrendingUp, Calendar, Users, BarChart3, Lightbulb, BookOpen } from 'lucide-react'
import { OnboardingBanner } from '../src/components/OnboardingBanner'
import { ActionCard } from '../src/components/ActionCard'
import { HelpIcon } from '../src/components/HelpIcon'
import { glossary } from '../src/data/glossary'

export default function Home() {
    return (
        <>
            <Head>
                <title>FPL Assistent — Dein intelligenter Fantasy Premier League Helfer</title>
                <meta name="description" content="Nutze KI-gestützte Prognosen für bessere FPL-Entscheidungen" />
            </Head>

            <div className="space-y-8">
                {/* Onboarding Banner */}
                <OnboardingBanner />

                {/* Page Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center space-y-4"
                >
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
                        Dein FPL{' '}
                        <span className="bg-gradient-to-r from-green-500 to-blue-600 bg-clip-text text-transparent">
                            Assistent
                        </span>
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Wähle eine Aktion, um zu starten
                    </p>
                </motion.div>

                {/* Main Action Cards */}
                <div className="grid md:grid-cols-3 gap-6">
                    <ActionCard
                        title="Prognosen ansehen"
                        description="Sieh dir die KI-Vorhersagen für alle Spieler an und finde die besten Optionen für dein Team."
                        icon={TrendingUp}
                        href="/predictions"
                        gradient="from-green-500 to-emerald-600"
                        delay={0.1}
                    />

                    <ActionCard
                        title="Aktuelle Spielwoche"
                        description="Erhalte Empfehlungen für die kommende Gameweek mit optimierter Aufstellung und Kapitänswahl."
                        icon={Calendar}
                        href="/predictions"
                        gradient="from-blue-500 to-cyan-600"
                        delay={0.2}
                    />

                    <ActionCard
                        title="Dein Team verwalten"
                        description="Analysiere dein aktuelles Team und erhalte Vorschläge für sinnvolle Transfers."
                        icon={Users}
                        href="/team"
                        gradient="from-purple-500 to-pink-600"
                        delay={0.3}
                    />
                </div>

                {/* Quick Info Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="grid md:grid-cols-2 gap-6"
                >
                    {/* Stats Card */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white inline-flex items-center">
                                Wie funktioniert&apos;s?<HelpIcon text={glossary.prognose} />
                            </h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            Unser Random Forest Modell analysiert Spielerstatistiken, Form und Gegnerqualität,
                            um dir präzise Punktvorhersagen für jede Gameweek zu liefern.
                        </p>
                    </div>

                    {/* Help Card */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <Lightbulb className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white inline-flex items-center">
                                Neu bei FPL?<HelpIcon text={glossary.gameweek} />
                            </h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                            Keine Sorge! Wir haben ein ausführliches Glossar mit allen wichtigen Begriffen.
                        </p>
                        <Link
                            href="/glossary"
                            className="inline-flex items-center space-x-2 text-sm font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                        >
                            <BookOpen className="h-4 w-4" />
                            <span>Zum Glossar →</span>
                        </Link>
                    </div>
                </motion.div>

                {/* CTA Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="bg-gradient-to-r from-green-500 to-blue-600 rounded-lg p-8 text-white text-center shadow-xl"
                >
                    <h2 className="text-3xl font-bold mb-4">
                        Bereit, dein Team zu verbessern?
                    </h2>
                    <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
                        Starte jetzt mit den Prognosen und hol dir einen Vorteil gegenüber deiner Liga!
                    </p>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Link
                            href="/predictions"
                            className="inline-block px-8 py-3 bg-white text-green-600 font-semibold rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                        >
                            Prognosen jetzt ansehen →
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </>
    )
}