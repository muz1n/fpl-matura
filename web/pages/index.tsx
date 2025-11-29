import Head from 'next/head'
import { motion } from 'framer-motion'

export default function Home() {


    return (
        <div className="min-h-screen bg-slate-900 text-slate-100">
            <Head>
                <title>FPL Assistent – KI-gestuetzte Maturaarbeit</title>
                <meta name="description" content="WebApp zur Optimierung eines Fantasy Premier League Teams mit Machine Learning. Entwickelt als Maturaarbeit." />
            </Head>
            <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    {/* Breadcrumb-Zeile */}
                    <div className="mb-2">
                        <span className="text-sm text-slate-300/80">Maturaarbeit 2025 &nbsp; &rsaquo; &nbsp; FPL Assistent</span>
                    </div>
                    {/* Hero-Block */}
                    <div className="bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg px-6 py-8 space-y-3 mb-10">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                            FPL Assistent – KI-gestuetzte Teamoptimierung
                        </h1>
                        <p className="text-base md:text-lg text-slate-300 max-w-2xl">
                            Machine Learning prognostiziert Fantasy Premier League Punkte. Die WebApp hilft dir, dein Team optimal aufzustellen und die besten Entscheidungen für jede Gameweek zu treffen.
                        </p>
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                        <div className="bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg p-6 space-y-3">
                            <h2 className="text-base font-semibold text-emerald-300 uppercase tracking-wide mb-2">Wie benutzt man diese App?</h2>
                            <ul className="list-disc list-inside space-y-2 mt-2 text-sm text-slate-200">
                                <li>Prognosen-Seite: Season, Gameweek und Methode wählen.</li>
                                <li>Lineup-Builder: Aufstellung testen oder echtes Team nachbauen.</li>
                                <li>Backtest: Methodenvergleich über mehrere Gameweeks.</li>
                            </ul>
                        </div>
                        <div className="bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg p-6 space-y-3">
                            <h2 className="text-base font-semibold text-emerald-300 uppercase tracking-wide mb-2">Technischer Überblick</h2>
                            <ul className="list-disc list-inside space-y-2">
                                <li>Backend: Python, Random Forest, Backtests.</li>
                                <li>Frontend: Next.js, React, TypeScript, Tailwind.</li>
                                <li>Ziel: FPL-Teamaufstellung mit ML-Unterstützung optimieren.</li>
                            </ul>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                        {/* Lineup-Builder Card */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100 mb-2">Lineup-Builder</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300 mb-4">
                                    <li>Interaktiver Pitch</li>
                                    <li>Drag &amp; Drop</li>
                                    <li>Captain/VC-Logik</li>
                                </ul>
                            </div>
                            <a href="/lineup-builder" className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                                Zum Lineup-Builder
                            </a>
                        </div>
                        {/* Prognosen Card */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100 mb-2">Prognosen</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300 mb-4">
                                    <li>Spielerpunkte</li>
                                    <li>Startelf &amp; Bench</li>
                                    <li>Historische Evaluation</li>
                                </ul>
                            </div>
                            <a href="/prognosen" className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                                Zu den Prognosen
                            </a>
                        </div>
                        {/* Backtest Card */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100 mb-2">Backtest</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300 mb-4">
                                    <li>Methodenvergleich</li>
                                    <li>MAE / RMSE / Spearman</li>
                                </ul>
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
