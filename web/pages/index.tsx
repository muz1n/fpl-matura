import Head from 'next/head'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { Navbar } from '../src/components/Navbar'
import { motion } from 'framer-motion'

export default function Home() {


    return (
        <div className="min-h-screen bg-slate-900 text-slate-100">
            <Head>
                <title>FPL Assistent – KI-gestuetzte Maturaarbeit</title>
                <meta name="description" content="WebApp zur Optimierung eines Fantasy Premier League Teams mit Machine Learning. Entwickelt als Maturaarbeit." />
            </Head>
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg px-6 py-6 md:py-8 space-y-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/40">
                            Maturaarbeit 2025
                        </span>
                        <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
                            FPL Assistent – KI-gestuetzte Teamoptimierung
                        </h1>
                        <p className="text-sm md:text-base text-slate-300 max-w-2xl">
                            Mit Machine Learning werden Fantasy Premier League Punkte prognostiziert. Die WebApp hilft dir, dein Team optimal aufzustellen und die besten Entscheidungen für jede Gameweek zu treffen. Statistische Modelle und KI-gestützte Analysen unterstützen dich bei der Auswahl und Strategie.
                        </p>
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-5 md:p-6">
                            <h2 className="text-sm font-semibold text-emerald-300 uppercase tracking-wide mb-2">Wie benutzt man diese App?</h2>
                            <ol className="list-decimal list-inside space-y-1 mt-2 text-sm text-slate-200">
                                <li>Season, Gameweek und Methode auf der Prognosen-Seite wählen.</li>
                                <li>Im Lineup-Builder eine Aufstellung testen oder dein echtes Team nachbauen.</li>
                                <li>Im Backtest anschauen, wie gut die Methoden über mehrere Gameweeks abgeschnitten haben.</li>
                            </ol>
                        </div>
                        <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4 text-sm text-slate-300 space-y-2">
                            <h2 className="text-sm font-semibold text-emerald-300 uppercase tracking-wide mb-2">Technischer Überblick</h2>
                            <ul className="list-disc list-inside space-y-1">
                                <li><span className="font-semibold text-slate-200">Backend:</span> Python, Random Forest, MA3, POS, rf_pos, Backtests.</li>
                                <li><span className="font-semibold text-slate-200">Frontend:</span> Next.js, React, TypeScript, Tailwind, framer-motion.</li>
                                <li><span className="font-semibold text-slate-200">Ziel:</span> FPL-Teamaufstellung mit ML-Unterstützung optimieren.</li>
                            </ul>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Lineup-Builder Card */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-md p-5 flex flex-col justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-100 mb-2">Lineup-Builder</h2>
                                <p className="text-sm text-slate-300 mb-4">Interaktiver Pitch, Drag &amp; Drop, Captain/VC-Logik</p>
                            </div>
                            <a href="/lineup-builder" className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                                Zum Lineup-Builder
                            </a>
                        </div>
                        {/* Prognosen Card */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-md p-5 flex flex-col justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-100 mb-2">Prognosen</h2>
                                <p className="text-sm text-slate-300 mb-4">Spielerpunkte, Startelf, Bench, historische Evaluation</p>
                            </div>
                            <a href="/prognosen" className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                                Zu den Prognosen
                            </a>
                        </div>
                        {/* Backtest Card */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-md p-5 flex flex-col justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-100 mb-2">Backtest</h2>
                                <p className="text-sm text-slate-300 mb-4">Methodenvergleich mit MAE/RMSE/Spearman</p>
                            </div>
                            <a href="/backtest" className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                                Zum Backtest
                            </a>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
