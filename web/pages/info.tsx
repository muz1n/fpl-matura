import Head from 'next/head'
import { motion } from 'framer-motion'
import {
    Info,
    Target,
    Database,
    Cpu,
    TrendingUp,
    AlertTriangle,
    Users,
    BarChart3,
    Trophy,
    BookOpen,
    Calendar
} from 'lucide-react'

export default function InfoPage() {
    return (
        <>
            <Head>
                <title>Über das Projekt - FPL Matura</title>
                <meta
                    name="description"
                    content="Informationen zur Maturaarbeit: KI-gestützte FPL-Teamoptimierung mit Machine Learning"
                />
            </Head>

            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="min-h-screen text-slate-100"
            >
                <div className="mx-auto px-4 pt-12 pb-16 space-y-6 max-w-7xl">
                    {/* Hero */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center space-y-3"
                    >
                        <div className="flex items-center justify-center gap-3">
                            <BookOpen className="w-10 h-10 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600" />
                            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                                Über das Projekt
                            </h1>
                        </div>
                        <p className="text-slate-300 text-lg max-w-3xl mx-auto">
                            Eine wissenschaftspropädeutische Maturaarbeit über KI-gestützte Teamoptimierung
                            im Fantasy Premier League
                        </p>
                    </motion.div>

                    {/* Fragestellung */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="bg-slate-800/90 border border-pink-500/20 rounded-2xl p-6 shadow-lg"
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <Target className="w-6 h-6 text-pink-500 flex-shrink-0 mt-1" />
                            <div>
                                <h2 className="text-2xl font-bold text-slate-100 mb-2">Fragestellung</h2>
                                <p className="text-slate-300 text-lg font-medium mb-3">
                                    Inwieweit lassen sich FPL-Punkte einzelner Spieler mit Machine-Learning-Methoden
                                    zuverlässig vorhersagen, und kann eine Web-App auf dieser Grundlage systematisch
                                    bessere Aufstellungen generieren als manuelle Auswahl?
                                </p>
                                <div className="bg-slate-900/60 border border-pink-500/20 rounded-xl p-4 space-y-2">
                                    <p className="text-sm text-slate-300">
                                        <strong className="text-pink-400">Hypothese:</strong> Ein regressives ML-Modell
                                        (z. B. Random Forest) erzielt eine mittlere Abweichung (MAE) von ~1.2 Punkten
                                        pro Spieler und liefert vergleichbare Teampunktzahlen wie
                                        einfache Baseline-Methoden (Moving Average, Positionsmittel).
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Was wird untersucht & Methoden */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="bg-slate-800/90 border border-purple-500/20 rounded-2xl p-6 shadow-lg"
                        >
                            <div className="flex items-start gap-3 mb-4">
                                <Cpu className="w-6 h-6 text-purple-500 flex-shrink-0 mt-1" />
                                <div>
                                    <h2 className="text-xl font-bold text-slate-100 mb-3">Gegenstand der Untersuchung</h2>
                                    <p className="text-slate-300 text-sm mb-3">
                                        Entwicklung eines <strong>Machine-Learning-Modells</strong> zur Prognose künftiger
                                        Fantasy-Punkte einzelner Premier-League-Spieler und Implementierung in eine
                                        <strong> Web-Applikation</strong> mit automatischer Teamauswahl.
                                    </p>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2">
                                            <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                            <p className="text-sm text-slate-300">Training mit historischen FPL-Daten (2016-2024)</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                            <p className="text-sm text-slate-300">Modelltraining pro Saison mit Cross-Validation</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                            <p className="text-sm text-slate-300">Automatische Teamoptimierung unter FPL-Regeln</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.25 }}
                            className="bg-slate-800/90 border border-pink-500/20 rounded-2xl p-6 shadow-lg"
                        >
                            <div className="flex items-start gap-3 mb-4">
                                <Database className="w-6 h-6 text-pink-500 flex-shrink-0 mt-1" />
                                <div>
                                    <h2 className="text-xl font-bold text-slate-100 mb-3">Daten & Merkmale</h2>
                                    <p className="text-slate-300 text-sm mb-3">
                                        Historische FPL-Daten von <strong>vaastav/Fantasy-Premier-League</strong> (GitHub)
                                        und offizielle API-Daten.
                                    </p>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2">
                                            <div className="w-2 h-2 bg-pink-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                            <p className="text-sm text-slate-300">Punkte, Einsatzminuten, Gegnerstärke</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="w-2 h-2 bg-pink-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                            <p className="text-sm text-slate-300">xG/xA, ICT-Index, Verletzungsstatus</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="w-2 h-2 bg-pink-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                            <p className="text-sm text-slate-300">Rolling Features (Form über 3 Spieltage)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Was bietet die Web-App */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="bg-slate-800/90 border border-purple-500/20 rounded-2xl p-6 shadow-lg"
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <Users className="w-6 h-6 text-purple-500 flex-shrink-0 mt-1" />
                            <div className="w-full">
                                <h2 className="text-2xl font-bold text-slate-100 mb-3">Was bietet diese Web-App?</h2>
                                <p className="text-slate-300 mb-4">
                                    Die Web-App demonstriert die entwickelten Methoden interaktiv und ermöglicht die
                                    Validierung der Prognosen anhand historischer Daten.
                                </p>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-slate-900/60 border border-purple-500/20 rounded-xl p-4">
                                        <TrendingUp className="w-5 h-5 text-pink-400 mb-2" />
                                        <h3 className="font-semibold text-slate-100 mb-1 text-sm">Prognosen</h3>
                                        <p className="text-xs text-slate-300">
                                            Erwartete Punkte für alle Spieler nach Saison, Spielwoche und Methode
                                        </p>
                                    </div>

                                    <div className="bg-slate-900/60 border border-purple-500/20 rounded-xl p-4">
                                        <BarChart3 className="w-5 h-5 text-purple-400 mb-2" />
                                        <h3 className="font-semibold text-slate-100 mb-1 text-sm">Backtest</h3>
                                        <p className="text-xs text-slate-300">
                                            Vergleich der Methoden über Spielwochen mit Effizienz-Metriken
                                        </p>
                                    </div>

                                    <div className="bg-slate-900/60 border border-purple-500/20 rounded-xl p-4">
                                        <Calendar className="w-5 h-5 text-pink-400 mb-2" />
                                        <h3 className="font-semibold text-slate-100 mb-1 text-sm">Multi-Season</h3>
                                        <p className="text-xs text-slate-300">
                                            Saison-übergreifende Analyse zur Stabilität der Prognosemethoden
                                        </p>
                                    </div>

                                    <div className="bg-slate-900/60 border border-purple-500/20 rounded-xl p-4">
                                        <BarChart3 className="w-5 h-5 text-purple-400 mb-2" />
                                        <h3 className="font-semibold text-slate-100 mb-1 text-sm">Feature Importance</h3>
                                        <p className="text-xs text-slate-300">
                                            Transparenz: Welche Merkmale beeinflussen die KI-Prognosen am stärksten?
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Methoden */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.35 }}
                        className="bg-slate-800/90 border border-pink-500/20 rounded-2xl p-6 shadow-lg"
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <TrendingUp className="w-6 h-6 text-pink-500 flex-shrink-0 mt-1" />
                            <div className="w-full">
                                <h2 className="text-2xl font-bold text-slate-100 mb-3">Prognosemethoden</h2>

                                <div className="space-y-3">
                                    <div className="bg-slate-900/60 border border-pink-500/20 rounded-xl p-4">
                                        <h3 className="font-semibold text-pink-400 mb-2">Random Forest (RF) - Hauptmodell</h3>
                                        <p className="text-sm text-slate-300 mb-2">
                                            Machine-Learning-Verfahren mit Entscheidungsbäumen. Nutzt Merkmale wie Form,
                                            Preis, Einsatzminuten und ICT-Werte.
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            Varianten: <code className="bg-slate-800 px-1.5 py-0.5 rounded">rf</code>,{' '}
                                            <code className="bg-slate-800 px-1.5 py-0.5 rounded">rf_pos</code>,{' '}
                                            <code className="bg-slate-800 px-1.5 py-0.5 rounded">rf_rank</code>,{' '}
                                            <code className="bg-slate-800 px-1.5 py-0.5 rounded">rf_relaxed</code>
                                        </p>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-3">
                                        <div className="bg-slate-900/60 border border-purple-500/20 rounded-xl p-4">
                                            <h3 className="font-semibold text-purple-400 mb-2">MA3 - Baseline</h3>
                                            <p className="text-sm text-slate-300">
                                                Durchschnitt der letzten 3 Spielwochen als einfache Vergleichsmethode
                                            </p>
                                        </div>

                                        <div className="bg-slate-900/60 border border-purple-500/20 rounded-xl p-4">
                                            <h3 className="font-semibold text-purple-400 mb-2">POS - Positionsmittel</h3>
                                            <p className="text-sm text-slate-300">
                                                Durchschnitt aller Spieler einer Position ohne individuelle Daten
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Validierung */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="bg-slate-800/90 border border-purple-500/20 rounded-2xl p-6 shadow-lg"
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <BarChart3 className="w-6 h-6 text-purple-500 flex-shrink-0 mt-1" />
                            <div>
                                <h2 className="text-xl font-bold text-slate-100 mb-3">Validierung & Metriken</h2>
                                <div className="space-y-2 text-sm text-slate-300">
                                    <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                        <p><strong className="text-purple-400">MAE:</strong> Mittlere absolute Abweichung der Punkteprognosen</p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                        <p><strong className="text-purple-400">Effizienz:</strong> Vergleich mit theoretisch bestem Team (Hindsight)</p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                        <p><strong className="text-purple-400">Simulation:</strong> Backtest über mehrere historische Spielwochen</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Grenzen & Annahmen */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.45 }}
                        className="bg-slate-800/90 border border-amber-500/20 rounded-2xl p-6 shadow-lg"
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                            <div>
                                <h2 className="text-2xl font-bold text-slate-100 mb-3">Grenzen & Annahmen</h2>
                                <div className="space-y-3 text-sm text-slate-300">
                                    <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-3">
                                        <p className="font-medium text-amber-300 mb-1">Training pro Saison</p>
                                        <p className="text-xs">
                                            Walk-Forward Cross-Season Testing: Training auf historischen Daten (2016-2020),
                                            Test auf neueren Saisons (2020-2024). Pro Saison wird ein separates Modell trainiert.
                                        </p>
                                    </div>
                                    <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-3">
                                        <p className="font-medium text-amber-300 mb-1">Keine Live-Informationen</p>
                                        <p className="text-xs">
                                            Verletzungen, Transfers oder taktische Anpassungen fliessen nicht ein.
                                            Die Web-App arbeitet nur mit historischen Statistiken.
                                        </p>
                                    </div>
                                    <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-3">
                                        <p className="font-medium text-amber-300 mb-1">Vereinfachte Realität</p>
                                        <p className="text-xs">
                                            Das Modell bildet nur einen Teil der FPL-Komplexität ab - dafür transparent
                                            und nachvollziehbar für eine Maturaarbeit.
                                        </p>
                                    </div>
                                    <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-3">
                                        <p className="font-medium text-amber-300 mb-1">Validierung mit alten Daten</p>
                                        <p className="text-xs">
                                            Alle Methoden wurden mit historischen Spielwochen getestet. Die Ergebnisse
                                            zeigen, was in der Vergangenheit funktioniert hat - nicht was garantiert in
                                            der Zukunft passieren wird.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Zielpublikum */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="bg-slate-800/90 border border-pink-500/20 rounded-2xl p-6 shadow-lg"
                    >
                        <div className="flex items-start gap-3">
                            <Info className="w-6 h-6 text-pink-500 flex-shrink-0 mt-1" />
                            <div>
                                <h2 className="text-xl font-bold text-slate-100 mb-2">Für wen ist diese Web-App?</h2>
                                <p className="text-slate-300 text-sm">
                                    Diese Web-App ist Teil einer wissenschaftspropädeutischen Maturaarbeit und richtet
                                    sich an <strong>Lehrpersonen, Schülerinnen und Schüler sowie FPL-Interessierte</strong>,
                                    die verstehen möchten, wie Machine Learning in einem klar abgegrenzten Szenario
                                    eingesetzt und validiert werden kann.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.main>
        </>
    )
}
