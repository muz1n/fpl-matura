import Head from 'next/head'
import { motion } from 'framer-motion'
import { BookOpen, Layers, TrendingUp, Target, AlertCircle } from 'lucide-react'

export default function MethodikPage() {
    return (
        <>
            <Head>
                <title>Methodik - FPL Matura</title>
                <meta
                    name="description"
                    content="Detaillierte Erklärung der verwendeten Prognosemethoden und des Trainingsprozesses"
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
                            <Layers className="w-10 h-10 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600" />
                            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                                Methodik
                            </h1>
                        </div>
                        <p className="text-slate-300 text-lg max-w-3xl mx-auto">
                            Wie funktionieren die verschiedenen Prognosemethoden und warum gibt es verschiedene Varianten?
                        </p>
                    </motion.div>

                    {/* Random Forest Varianten */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <Layers className="w-6 h-6 text-pink-500" />
                            <h2 className="text-2xl font-bold text-slate-100">Random Forest Varianten</h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {/* RF Standard */}
                            <div className="bg-slate-800/90 border border-pink-500/20 rounded-xl p-5 shadow-lg">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="p-2 bg-pink-500/15 rounded-lg">
                                        <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-pink-400 mb-2">Random Forest (Standard)</h3>
                                        <p className="text-sm text-slate-300 mb-3">
                                            Das Basismodell trainiert direkt auf FPL-Punkte. Es nutzt alle verfügbaren Features
                                            (Form, Gegnerstärke, ICT-Index usw.) und lernt komplexe, nichtlineare Zusammenhänge.
                                        </p>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-400"><strong className="text-pink-400">Vorteil:</strong> Flexibel, erfasst komplexe Muster</p>
                                            <p className="text-xs text-slate-400"><strong className="text-pink-400">Nachteil:</strong> Kann bei extremen Werten überschätzen</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RF Rank */}
                            <div className="bg-slate-800/90 border border-purple-500/20 rounded-xl p-5 shadow-lg">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="p-2 bg-purple-500/15 rounded-lg">
                                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-purple-400 mb-2">Random Forest (Rank)</h3>
                                        <p className="text-sm text-slate-300 mb-3">
                                            Statt direkter Punkteprognose lernt dieses Modell die <strong>Rangfolge</strong> der Spieler
                                            und konvertiert diese dann zurück in erwartete Punkte. Reduziert Ausreisser.
                                        </p>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-400"><strong className="text-purple-400">Vorteil:</strong> Stabilere Prognosen, weniger Extremwerte</p>
                                            <p className="text-xs text-slate-400"><strong className="text-purple-400">Nachteil:</strong> Kann echte Hochleistungen unterschätzen</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RF Position */}
                            <div className="bg-slate-800/90 border border-fuchsia-500/20 rounded-xl p-5 shadow-lg">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="p-2 bg-fuchsia-500/15 rounded-lg">
                                        <div className="w-3 h-3 rounded-full bg-fuchsia-500"></div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-fuchsia-400 mb-2">Random Forest (Position)</h3>
                                        <p className="text-sm text-slate-300 mb-3">
                                            Trainiert <strong>separate Modelle für jede Position</strong> (GK, DEF, MID, FWD).
                                            Berücksichtigt positionsspezifische Scoring-Muster (z.B. Clean Sheets für GK/DEF).
                                        </p>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-400"><strong className="text-fuchsia-400">Vorteil:</strong> Positionsspezifische Optimierung</p>
                                            <p className="text-xs text-slate-400"><strong className="text-fuchsia-400">Nachteil:</strong> Weniger Trainingsdaten pro Modell</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RF Relaxed */}
                            <div className="bg-slate-800/90 border border-pink-500/20 rounded-xl p-5 shadow-lg">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="p-2 bg-pink-500/15 rounded-lg">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#c026d3' }}></div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-fuchsia-300 mb-2">Random Forest (Relaxed)</h3>
                                        <p className="text-sm text-slate-300 mb-3">
                                            Variante mit <strong>weniger strikten Hyperparametern</strong> (weniger Tiefe, mehr Regularisierung).
                                            Ziel: Generalisierung verbessern und Overfitting reduzieren.
                                        </p>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-400"><strong className="text-fuchsia-300">Vorteil:</strong> Bessere Generalisierung</p>
                                            <p className="text-xs text-slate-400"><strong className="text-fuchsia-300">Nachteil:</strong> Eventuell niedrigere Trainingsgenauigkeit</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Baseline Methoden */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <Target className="w-6 h-6 text-violet-500" />
                            <h2 className="text-2xl font-bold text-slate-100">Baseline-Methoden (Vergleichswerte)</h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {/* MA3 */}
                            <div className="bg-slate-800/90 border border-violet-500/20 rounded-xl p-5 shadow-lg">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="p-2 bg-violet-500/15 rounded-lg">
                                        <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-violet-400 mb-2">Formdurchschnitt (MA3)</h3>
                                        <p className="text-sm text-slate-300 mb-3">
                                            <strong>Moving Average 3:</strong> Einfache Heuristik, die den Durchschnitt der letzten
                                            3 Spieltage als Prognose verwendet. Keine ML-Methode, nur Formtrend.
                                        </p>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-400"><strong className="text-violet-400">Zweck:</strong> Baseline für Vergleich - wie gut ist ML vs. naive Form?</p>
                                            <p className="text-xs text-slate-400"><strong className="text-violet-400">Schwäche:</strong> Ignoriert Gegnerstärke, Verletzungen, Rotation</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* POS */}
                            <div className="bg-slate-800/90 border border-indigo-500/20 rounded-xl p-5 shadow-lg">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="p-2 bg-indigo-500/15 rounded-lg">
                                        <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-indigo-400 mb-2">Positionsmittel (POS)</h3>
                                        <p className="text-sm text-slate-300 mb-3">
                                            Prognostiziert für jeden Spieler den <strong>Durchschnitt aller Spieler seiner Position</strong>.
                                            Naive Methode ohne individuelle Betrachtung.
                                        </p>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-400"><strong className="text-indigo-400">Zweck:</strong> Absolutes Minimum - zeigt, wie viel ML bringt</p>
                                            <p className="text-xs text-slate-400"><strong className="text-indigo-400">Schwäche:</strong> Ignoriert individuelle Leistung komplett</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Trainingsprozess */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="bg-slate-800/90 border border-pink-500/20 rounded-xl p-6 shadow-lg"
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <TrendingUp className="w-6 h-6 text-pink-500 flex-shrink-0 mt-1" />
                            <div>
                                <h2 className="text-2xl font-bold text-slate-100 mb-4">Trainingsprozess</h2>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-pink-500/20 rounded-full flex items-center justify-center">
                                            <span className="text-pink-400 font-bold">1</span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-200 mb-1">Datenaufbereitung</h3>
                                            <p className="text-sm text-slate-300">
                                                Historische FPL-Daten (2016-2024) werden bereinigt, fehlende Werte behandelt,
                                                und Rolling Features (Form über 3 GWs) berechnet.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                                            <span className="text-purple-400 font-bold">2</span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-200 mb-1">Feature Engineering</h3>
                                            <p className="text-sm text-slate-300">
                                                Zusätzliche Features: Gegnerstärke (defensiv/offensiv), Heim/Auswärts,
                                                ICT-Index-Komponenten (Influence, Creativity, Threat), Verletzungsstatus.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-pink-500/20 rounded-full flex items-center justify-center">
                                            <span className="text-pink-400 font-bold">3</span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-200 mb-1">Training & Validation</h3>
                                            <p className="text-sm text-slate-300">
                                                Modelle werden <strong>pro Saison</strong> trainiert mit Walk-Forward Validation.
                                                Cross-Season Testing verhindert Look-Ahead Bias.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                                            <span className="text-purple-400 font-bold">4</span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-200 mb-1">Aufstellungsoptimierung</h3>
                                            <p className="text-sm text-slate-300">
                                                Prognosen werden mit FPL-Regeln (Budget, Formation, Team-Limits) kombiniert,
                                                um optimale 11er-Aufstellung + Kapitän zu generieren.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Limitationen */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="bg-slate-800/90 border border-orange-500/20 rounded-xl p-6 shadow-lg"
                    >
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                            <div>
                                <h2 className="text-2xl font-bold text-slate-100 mb-3">Limitationen & Einschränkungen</h2>
                                <div className="space-y-2">
                                    <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                        <p className="text-sm text-slate-300">
                                            <strong className="text-orange-400">Keine Echtzeit-Daten:</strong> Modelle nutzen nur historische Daten bis 2023-24.
                                            Aktuelle Saison 2024-25 ist nicht verfügbar.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                        <p className="text-sm text-slate-300">
                                            <strong className="text-orange-400">Unvorhersehbare Events:</strong> Verletzungen während Spieltagen,
                                            Last-Minute Rotationen oder rote Karten können nicht antizipiert werden.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                        <p className="text-sm text-slate-300">
                                            <strong className="text-orange-400">Transfer-Beschränkungen:</strong> Backtest simuliert nur Aufstellungen,
                                            keine multi-GW Transfer-Strategien.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                        <p className="text-sm text-slate-300">
                                            <strong className="text-orange-400">Budget-Vereinfachung:</strong> Preisänderungen während Saison
                                            werden im Backtest nicht vollständig simuliert.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.main>
        </>
    )
}
