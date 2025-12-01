import Head from 'next/head'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function Home() {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-100">
            <Head>
                <title>FPL Assistent | KI gestützte Maturaarbeit</title>
                <meta
                    name="description"
                    content="WebApp zur Optimierung eines Fantasy Premier League Teams mit Machine Learning. Entwickelt als Maturaarbeit."
                />
            </Head>

            <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    {/* Breadcrumb */}
                    <div className="mb-2">
                        <span className="text-sm text-slate-300/80">
                            Maturaarbeit 2025 › FPL Assistent
                        </span>
                    </div>

                    {/* Hero */}
                    <div className="bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg px-6 py-8 space-y-3 mb-10">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                            FPL Assistent - KI gestützte Teamoptimierung
                        </h1>
                        <p className="text-base md:text-lg text-slate-300 max-w-2xl">
                            Machine Learning prognostiziert Fantasy Premier League Punkte. Die WebApp hilft dir,
                            dein Team optimal aufzustellen und bessere Entscheidungen für jede Gameweek zu treffen.
                        </p>
                        <p className="text-sm text-slate-400">
                            Dieses Projekt ist Teil meiner Maturaarbeit und soll zeigen, wie man KI im Sport
                            praxisnah einsetzen kann.
                        </p>
                        <p className="text-sm text-slate-300 mt-1">
                            Wenn du die App zum ersten Mal benutzt, starte mit den Prognosen und dem Lineup Builder.
                        </p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    {/* Intro Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        {/* Wie benutzt man diese App */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg p-6 space-y-3">
                            <h2 className="text-base font-semibold text-emerald-300 uppercase tracking-wide mb-2">
                                Wie benutzt man diese App?
                            </h2>
                            <ol className="list-decimal list-inside space-y-2 mt-2 text-sm text-slate-200">
                                <li>
                                    <span className="font-semibold">Prognosen:</span> Wähle Season, Gameweek
                                    und Methode, um die erwarteten Punkte der Spieler zu sehen.
                                </li>
                                <li>
                                    <span className="font-semibold">Lineup Builder:</span> Stelle mit Drag and Drop
                                    dein Team zusammen und teste verschiedene Aufstellungen.
                                </li>
                                <li>
                                    <span className="font-semibold">Backtest:</span> Vergleiche, welche Methode
                                    historisch am besten abgeschnitten hat (MAE, RMSE, Spearman).
                                </li>
                                <li>
                                    <span className="font-semibold">Multi Season:</span> Prüfe, wie stabil die
                                    Methoden über mehrere Saisons funktionieren.
                                </li>
                                <li>
                                    <span className="font-semibold">Feature Importance:</span> Sieh dir an, welche
                                    Merkmale im Random Forest Modell besonders wichtig sind.
                                </li>
                                <li>
                                    <span className="font-semibold">Info:</span> Lies die wichtigsten Annahmen,
                                    Datenquellen und Grenzen der Anwendung nach.
                                </li>
                            </ol>
                            <p className="text-xs text-slate-400 mt-3">
                                Die einzelnen Seiten erklären die Details jeweils noch genauer. Diese Startseite
                                dient als Einstieg in die WebApp und in die Maturaarbeit.
                            </p>
                        </div>

                        {/* Technischer Überblick */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg p-6 space-y-3">
                            <h2 className="text-base font-semibold text-emerald-300 uppercase tracking-wide mb-2">
                                Technischer Überblick
                            </h2>
                            <ul className="list-disc list-inside space-y-2 text-sm text-slate-200">
                                <li>Backend: Python, Random Forest Modelle, Auswertungsskripte und Backtests.</li>
                                <li>Frontend: Next.js, React, TypeScript, Tailwind CSS.</li>
                                <li>
                                    Datengrundlage: Historische FPL Daten aus mehreren Saisons
                                    (keine Live API Abfragen in Echtzeit).
                                </li>
                                <li>
                                    Ziel: FPL Teamaufstellung transparent optimieren und die Grenzen von ML Prognosen
                                    im FPL Kontext zeigen.
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Feature Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                        {/* Lineup Builder */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100 mb-2">Lineup Builder</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300 mb-4">
                                    <li>Interaktiver Pitch mit allen Positionen</li>
                                    <li>Drag and Drop Aufstellung mit Bench</li>
                                    <li>Captain und Vice Captain Logik</li>
                                </ul>
                            </div>
                            <Link
                                href="/lineup-builder"
                                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                            >
                                Zum Lineup Builder
                            </Link>
                        </div>

                        {/* Prognosen */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100 mb-2">Prognosen</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300 mb-4">
                                    <li>Prognostizierte Spielerpunkte pro Gameweek</li>
                                    <li>Startelf und Bank Empfehlung nach Methode</li>
                                    <li>Vergleich der Prognosen verschiedener Modelle</li>
                                </ul>
                            </div>
                            <Link
                                href="/prognosen"
                                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                            >
                                Zu den Prognosen
                            </Link>
                        </div>

                        {/* Backtest */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100 mb-2">Backtest</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300 mb-4">
                                    <li>Methodenvergleich über viele Gameweeks</li>
                                    <li>MAE, RMSE und Spearman als Kennzahlen</li>
                                    <li>Simulation der FPL Punkte mit echten Daten</li>
                                </ul>
                            </div>
                            <Link
                                href="/backtest"
                                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                            >
                                Zum Backtest
                            </Link>
                        </div>

                        {/* Multi Season */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100 mb-2">Multi Season</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300 mb-4">
                                    <li>Vergleich der Methoden über mehrere Saisons</li>
                                    <li>Stabilität und Schwankungen der Modelle</li>
                                    <li>Einordnung im Kontext verschiedener FPL Jahre</li>
                                </ul>
                            </div>
                            <Link
                                href="/multi-season"
                                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                            >
                                Zur Multi Season Ansicht
                            </Link>
                        </div>

                        {/* Feature Importance */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100 mb-2">Feature Importance</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300 mb-4">
                                    <li>Wichtige Merkmale des Random Forest Modells</li>
                                    <li>Einfluss von Preis, Position und Statistiken</li>
                                    <li>Verstehen, warum das Modell bestimmte Spieler bevorzugt</li>
                                </ul>
                            </div>
                            <Link
                                href="/feature-importance"
                                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                            >
                                Zu den Features
                            </Link>
                        </div>

                        {/* Info */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100 mb-2">Info</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300 mb-4">
                                    <li>Überblick über das Projekt im Kontext der Maturaarbeit</li>
                                    <li>Datenquellen, Annahmen und Grenzen der Modelle</li>
                                    <li>Einordnung für Lehrpersonen und Mitschüler</li>
                                </ul>
                            </div>
                            <Link
                                href="/info"
                                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                            >
                                Zur Info Seite
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
