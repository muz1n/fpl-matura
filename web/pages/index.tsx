import Head from 'next/head'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp, BarChart3, Calendar, Database, Info, Activity, Layers, BookOpen } from 'lucide-react'

export default function Home() {
    return (
        <div className="text-slate-100">
            <Head>
                <title>FPL Matura - KI-gestützte Teamoptimierung</title>
                <meta
                    name="description"
                    content="Wissenschaftspropädeutische Maturaarbeit: Machine Learning Prognosen für Fantasy Premier League"
                />
            </Head>

            <div className="mx-auto px-4 pt-20 pb-24 space-y-16 max-w-7xl">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center space-y-8"
                >
                    {/* Titel & Beschreibung - KEIN Icon */}
                    <div className="space-y-4">
                        <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 animate-gradient">
                            FPL Matura
                        </h1>
                        <p className="text-2xl md:text-3xl text-slate-200 font-semibold">
                            Machine Learning trifft Fantasy Premier League
                        </p>
                        <p className="text-base md:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
                            Eine wissenschaftspropädeutische Maturaarbeit über KI-gestützte Teamoptimierung.
                            Erforsche, wie Machine-Learning-Algorithmen Spielerleistungen vorhersagen und
                            optimale FPL-Aufstellungen generieren können.
                        </p>
                    </div>

                    {/* Wissenschaftliche Infos */}
                    <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto text-sm">
                        <div className="bg-slate-800/50 border border-pink-500/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Database className="w-4 h-4 text-pink-400" />
                                <span className="font-semibold text-slate-200">Datenbasis</span>
                            </div>
                            <p className="text-slate-400">8+ Saisons FPL-Daten (2016-2024)</p>
                        </div>
                        <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <BarChart3 className="w-4 h-4 text-purple-400" />
                                <span className="font-semibold text-slate-200">Methoden</span>
                            </div>
                            <p className="text-slate-400">Random Forest (Standard, Rank, Position), Baselines (MA3, POS)</p>
                        </div>
                        <div className="bg-slate-800/50 border border-pink-500/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-pink-400" />
                                <span className="font-semibold text-slate-200">Validierung</span>
                            </div>
                            <p className="text-slate-400">Cross-Season Backtest, Effizienz-Metriken</p>
                        </div>
                    </div>
                </motion.div>

                {/* Hauptbereiche der Arbeit */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="space-y-8"
                >
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                            Explorative Datenanalyse
                        </h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            Interaktive Tools zur Analyse der ML-Modelle und historischen Performance
                        </p>
                    </div>

                    <div className="space-y-6">
                        {/* Erste Reihe: 3 Karten */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Prognosen */}
                            <motion.div
                                whileHover={{ scale: 1.02, y: -5 }}
                                transition={{ type: "spring", stiffness: 300 }}
                                className="bg-gradient-to-br from-slate-800/90 to-slate-800/50 border border-pink-500/20 rounded-2xl shadow-lg p-6 flex flex-col hover:border-pink-500/40 hover:shadow-pink-500/10 transition-all"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-pink-500/15 rounded-lg border border-pink-500/20">
                                            <TrendingUp className="w-6 h-6 text-pink-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-100">Prognosen</h3>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-4">
                                        KI-Vorhersagen für historische Gameweeks mit Vergleich verschiedener ML-Methoden
                                        und automatischer Aufstellungsgenerierung.
                                    </p>
                                </div>
                                <Link
                                    href="/prognosen"
                                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white transition-all shadow-lg shadow-pink-500/20"
                                >
                                    Erkunden →
                                </Link>
                            </motion.div>

                            {/* Backtest */}
                            <motion.div
                                whileHover={{ scale: 1.02, y: -5 }}
                                transition={{ type: "spring", stiffness: 300 }}
                                className="bg-gradient-to-br from-slate-800/90 to-slate-800/50 border border-purple-500/20 rounded-2xl shadow-lg p-6 flex flex-col hover:border-purple-500/40 hover:shadow-purple-500/10 transition-all"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-purple-500/15 rounded-lg border border-purple-500/20">
                                            <Activity className="w-6 h-6 text-purple-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-100">Backtest</h3>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-4">
                                        Historische Performance-Tests mit Effizienz-Metriken (MAE, RMSE, Spearman)
                                        zum Methodenvergleich.
                                    </p>
                                </div>
                                <Link
                                    href="/backtest"
                                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white transition-all shadow-lg shadow-pink-500/20"
                                >
                                    Erkunden →
                                </Link>
                            </motion.div>

                            {/* Multi-Season */}
                            <motion.div
                                whileHover={{ scale: 1.02, y: -5 }}
                                transition={{ type: "spring", stiffness: 300 }}
                                className="bg-gradient-to-br from-slate-800/90 to-slate-800/50 border border-pink-500/20 rounded-2xl shadow-lg p-6 flex flex-col hover:border-pink-500/40 hover:shadow-pink-500/10 transition-all"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-pink-500/15 rounded-lg border border-pink-500/20">
                                            <Calendar className="w-6 h-6 text-pink-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-100">Multi-Season</h3>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-4">
                                        Saison-übergreifende Analyse zur Validierung der Modellstabilität
                                        und Cross-Season-Generalisierung.
                                    </p>
                                </div>
                                <Link
                                    href="/multi-season"
                                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white transition-all shadow-lg shadow-pink-500/20"
                                >
                                    Erkunden →
                                </Link>
                            </motion.div>
                        </div>

                        {/* Zweite Reihe: 4 Karten */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Feature Importance */}
                            <motion.div
                                whileHover={{ scale: 1.02, y: -5 }}
                                transition={{ type: "spring", stiffness: 300 }}
                                className="bg-gradient-to-br from-slate-800/90 to-slate-800/50 border border-purple-500/20 rounded-2xl shadow-lg p-6 flex flex-col hover:border-purple-500/40 hover:shadow-purple-500/10 transition-all"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-purple-500/15 rounded-lg border border-purple-500/20">
                                            <BarChart3 className="w-6 h-6 text-purple-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-100">Feature Importance</h3>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-4">
                                        Analyse der wichtigsten Modell-Features für Transparenz
                                        und Nachvollziehbarkeit der Vorhersagen.
                                    </p>
                                </div>
                                <Link
                                    href="/feature-importance"
                                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white transition-all shadow-lg shadow-pink-500/20"
                                >
                                    Erkunden →
                                </Link>
                            </motion.div>

                            {/* Methodik */}
                            <motion.div
                                whileHover={{ scale: 1.02, y: -5 }}
                                transition={{ type: "spring", stiffness: 300 }}
                                className="bg-gradient-to-br from-slate-800/90 to-slate-800/50 border border-fuchsia-500/20 rounded-2xl shadow-lg p-6 flex flex-col hover:border-fuchsia-500/40 hover:shadow-fuchsia-500/10 transition-all"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-fuchsia-500/15 rounded-lg border border-fuchsia-500/20">
                                            <Layers className="w-6 h-6 text-fuchsia-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-100">Methodik</h3>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-4">
                                        Erklärung der RF-Varianten, Baselines und des
                                        Trainingsprozesses mit Limitationen.
                                    </p>
                                </div>
                                <Link
                                    href="/methodik"
                                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white transition-all shadow-lg shadow-pink-500/20"
                                >
                                    Erkunden →
                                </Link>
                            </motion.div>

                            {/* Glossar */}
                            <motion.div
                                whileHover={{ scale: 1.02, y: -5 }}
                                transition={{ type: "spring", stiffness: 300 }}
                                className="bg-gradient-to-br from-slate-800/90 to-slate-800/50 border border-violet-500/20 rounded-2xl shadow-lg p-6 flex flex-col hover:border-violet-500/40 hover:shadow-violet-500/10 transition-all"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-violet-500/15 rounded-lg border border-violet-500/20">
                                            <BookOpen className="w-6 h-6 text-violet-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-100">Glossar</h3>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-4">
                                        Begriffserklärungen zu FPL, ML-Metriken und
                                        Feature-Namen für besseres Verständnis.
                                    </p>
                                </div>
                                <Link
                                    href="/glossar"
                                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white transition-all shadow-lg shadow-pink-500/20"
                                >
                                    Nachschlagen →
                                </Link>
                            </motion.div>

                            {/* Projektinfo */}
                            <motion.div
                                whileHover={{ scale: 1.02, y: -5 }}
                                transition={{ type: "spring", stiffness: 300 }}
                                className="bg-gradient-to-br from-slate-800/90 to-slate-800/50 border border-pink-500/20 rounded-2xl shadow-lg p-6 flex flex-col hover:border-pink-500/40 hover:shadow-pink-500/10 transition-all"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-pink-500/15 rounded-lg border border-pink-500/20">
                                            <Info className="w-6 h-6 text-pink-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-100">Projektinfo</h3>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-4">
                                        Fragestellung, Hypothese, Datenquellen und
                                        Überblick zur Maturaarbeit.
                                    </p>
                                </div>
                                <Link
                                    href="/info"
                                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white transition-all shadow-lg shadow-pink-500/20"
                                >
                                    Mehr erfahren →
                                </Link>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
