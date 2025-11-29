import Head from 'next/head'
import { Info, Database, BarChart3, BrainCircuit, TrendingUp, AlertCircle } from 'lucide-react'

export default function InfoPage() {
    return (
        <>
            <Head>
                <title>Info – FPL Maturaarbeit</title>
                <meta name="description" content="Informationen über die FPL Vorhersage-WebApp" />
            </Head>

            <main className="min-h-screen bg-slate-900 text-slate-100">
                <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Info className="w-10 h-10 text-blue-600" />
                            <h1 className="text-4xl font-bold text-slate-100">
                                Informationen zur WebApp
                            </h1>
                        </div>
                        <p className="text-lg text-slate-300">
                            Ein Überblick für Lehrpersonen und Interessierte
                        </p>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-8">
                        {/* Was macht diese WebApp */}
                        <section className="bg-slate-800/90 rounded-lg shadow-lg p-6 border border-slate-700">
                            <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                                <BarChart3 className="w-6 h-6 text-blue-600" />
                                Was macht diese WebApp?
                            </h2>
                            <div className="text-sm md:text-base text-slate-200 leading-relaxed space-y-3">
                                <p>
                                    Diese Anwendung prognostiziert die zu erwartenden Punkte von Fantasy Premier League Spielern für kommende Spielwochen.
                                </p>
                                <p>
                                    Sie vergleicht verschiedene Vorhersagemethoden automatisch und zeigt transparent, welche Ansätze funktionieren und warum.
                                </p>
                                <p>
                                    Die WebApp unterstützt dabei, fundierte Entscheidungen bei der Teamwahl zu treffen, indem sie Prognosen, historische Genauigkeit und Modellverhalten verständlich darstellt.
                                </p>
                            </div>
                        </section>

                        {/* Welche Daten */}
                        <section className="bg-slate-800/90 rounded-lg shadow-lg p-6 border border-slate-700">
                            <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                                <Database className="w-6 h-6 text-green-600" />
                                Welche Daten werden verwendet?
                            </h2>
                            <div className="text-sm md:text-base text-slate-200 leading-relaxed space-y-3">
                                <p>
                                    Die Anwendung nutzt historische FPL-Daten aus vergangenen Saisons (z.B. 2022–23, 2023–24). Es werden keine Live-Daten von der offiziellen FPL-API abgerufen.
                                </p>
                                <p>
                                    Jede Datei ist mit einem Saison-Prefix versehen (z.B. <code className="bg-slate-700 px-2 py-1 rounded">predictions_2022-23_gw30_rf.json</code>), damit klar ist, aus welcher Saison die Daten stammen. Das gewährleistet Nachvollziehbarkeit und verhindert Verwechslungen.
                                </p>
                                <p>
                                    Die Daten umfassen Spielerinformationen wie Punkte, Minuten, ICT-Index (Influence, Creativity, Threat) sowie weitere Statistiken pro Spielwoche.
                                </p>
                            </div>
                        </section>

                        {/* Welche Methoden */}
                        <section className="bg-slate-800/90 rounded-lg shadow-lg p-6 border border-slate-700">
                            <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                                <BrainCircuit className="w-6 h-6 text-purple-600" />
                                Welche Prognosemethoden gibt es?
                            </h2>
                            <div className="space-y-4">
                                <div className="border-l-4 border-blue-500 pl-4">
                                    <h3 className="font-semibold text-slate-100 mb-1">
                                        RF (Random Forest)
                                    </h3>
                                    <p className="text-slate-200">
                                        Ein maschinelles Lernverfahren, das aus vergangenen Spielwochen lernt und dabei Merkmale wie Form, Preis und ICT-Werte berücksichtigt. Dies ist die Hauptmethode der Arbeit.
                                    </p>
                                </div>

                                <div className="border-l-4 border-green-500 pl-4">
                                    <h3 className="font-semibold text-slate-100 mb-1">
                                        MA3 (Moving Average)
                                    </h3>
                                    <p className="text-sm md:text-base text-slate-200 leading-relaxed">
                                        Eine einfache Heuristik: Der Durchschnitt der letzten 3 Spielwochen wird als Vorhersage verwendet. Dient als Vergleichsbasis.
                                    </p>
                                </div>

                                <div className="border-l-4 border-orange-500 pl-4">
                                    <h3 className="font-semibold text-slate-100 mb-1">
                                        POS (Positions-Durchschnitt)
                                    </h3>
                                    <p className="text-sm md:text-base text-slate-200 leading-relaxed">
                                        Berechnet den Durchschnitt aller Spieler einer Position (z.B. alle Stürmer). Zeigt die Baseline-Erwartung ohne individuelle Betrachtung.
                                    </p>
                                </div>

                                <div className="border-l-4 border-indigo-500 pl-4">
                                    <h3 className="font-semibold text-slate-100 mb-1">
                                        Effizienz (Punkte / Optimum)
                                    </h3>
                                    <p className="text-sm md:text-base text-slate-200 leading-relaxed">
                                        Vergleicht die mit einer Methode erzielten Punkte mit dem theoretisch besten Team (Hindsight-Optimum). 100% bedeutet perfekte Auswahl, niedrigere Werte zeigen Verbesserungspotenzial.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Wie interpretiere ich die Seiten */}
                        <section className="bg-slate-800/90 rounded-lg shadow-lg p-6 border border-slate-700">
                            <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                                <TrendingUp className="w-6 h-6 text-emerald-600" />
                                Wie interpretiere ich die Seiten?
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-slate-100 mb-2">
                                        Prognosen-Seite
                                    </h3>
                                    <p className="text-slate-200">
                                        Zeigt die vorhergesagten Punkte für jeden Spieler in einem bestimmten Gameweek. Sie können nach Position filtern und sehen, welche Spieler die höchsten Erwartungen haben.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-slate-100 mb-2">
                                        Backtest-Seite
                                    </h3>
                                    <p className="text-sm md:text-base text-slate-200 leading-relaxed">
                                        Vergleicht die verschiedenen Methoden über mehrere Gameweeks hinweg. Die Effizienz zeigt, wie nah jede Methode am theoretisch optimalen Team war. Ein direkter Methodenvergleich wird hier möglich.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-slate-100 mb-2">
                                        Feature Importance-Seite
                                    </h3>
                                    <p className="text-sm md:text-base text-slate-200 leading-relaxed">
                                        Zeigt, welche Merkmale (z.B. Preis, Form, ICT-Index) das Random Forest Modell als wichtig erachtet. Das hilft zu verstehen, was das Modell gelernt hat und wo mögliche Schwachstellen liegen.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Grenzen und Annahmen */}
                        <section className="bg-slate-800/90 rounded-lg shadow-lg p-6 border border-slate-700">
                            <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                                <AlertCircle className="w-6 h-6 text-amber-400" />
                                Grenzen und Annahmen
                            </h2>
                            <div className="bg-slate-900/80 border border-amber-500/60 rounded-2xl shadow-lg p-6 text-sm md:text-base text-slate-200 leading-relaxed space-y-3">
                                <p>
                                    <strong>Fokus auf eine Saison:</strong> Die Modelle trainieren und testen innerhalb derselben Saison (z.B. 2022–23). Saison-übergreifende Muster werden nicht berücksichtigt.
                                </p>
                                <p>
                                    <strong>Keine Live-Informationen:</strong> Verletzungen, Transfernews, taktische Änderungen oder aktuelle Form werden nicht einbezogen. Das Modell kennt nur historische Statistiken.
                                </p>
                                <p>
                                    <strong>Vereinfachung der Realität:</strong> FPL ist komplex und von vielen Faktoren abhängig. Diese WebApp modelliert einen Teil davon, ist aber bewusst vereinfacht, um konsistente und nachvollziehbare Ergebnisse zu liefern.
                                </p>
                                <p>
                                    <strong>Validierung wichtig:</strong> Alle Methoden werden transparent mit echten historischen Daten getestet. Die Ergebnisse zeigen, was funktioniert hat – nicht was definitiv in der Zukunft funktionieren wird.
                                </p>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </>
    )
}
