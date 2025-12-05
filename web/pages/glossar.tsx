import Head from 'next/head'
import { motion } from 'framer-motion'
import { BookOpen, HelpCircle, Trophy, Users, Cpu, Tag } from 'lucide-react'

export default function GlossarPage() {
    const glossarEntries = [
        {
            category: "FPL-Begriffe",
            color: "pink",
            icon: Trophy,
            entries: [
                {
                    term: "GW (Gameweek)",
                    definition: "Spieltag in der Premier League. Eine Saison hat 38 Gameweeks."
                },
                {
                    term: "ICT-Index",
                    definition: "Zusammengesetzter Wert aus Influence (Einfluss), Creativity (Kreativität) und Threat (Torgefahr). Höhere Werte = aktivere Spieler."
                },
                {
                    term: "xG (Expected Goals)",
                    definition: "Erwartete Tore basierend auf Chancenqualität. xG von 0.5 = 50% Wahrscheinlichkeit für Tor."
                },
                {
                    term: "xA (Expected Assists)",
                    definition: "Erwartete Vorlagen basierend auf Chancenerstellung für Mitspieler."
                },
                {
                    term: "Clean Sheet",
                    definition: "Kein Gegentor für Torhüter/Verteidiger. GK/DEF erhalten +4 Punkte, MID +1 Punkt."
                },
                {
                    term: "Bonus Points",
                    definition: "Zusätzliche Punkte (1-3) für die besten Spieler eines Spiels nach BPS-System."
                },
                {
                    term: "Captain",
                    definition: "Ein Spieler pro Team dessen Punkte verdoppelt werden. Wichtigste strategische Entscheidung."
                },
                {
                    term: "Formation",
                    definition: "Aufstellung (z.B. 3-4-3 = 3 Verteidiger, 4 Mittelfeldspieler, 3 Stürmer). 1 GK ist immer fix."
                }
            ]
        },
        {
            category: "Positionen",
            color: "purple",
            icon: Users,
            entries: [
                {
                    term: "GK (Goalkeeper)",
                    definition: "Torhüter. Punkte für Paraden (jede 3. = +1), Clean Sheets (+4), Penalties gehalten (+5)."
                },
                {
                    term: "DEF (Defender)",
                    definition: "Verteidiger. Punkte für Clean Sheets (+4), Tore (+6), Assists (+3)."
                },
                {
                    term: "MID (Midfielder)",
                    definition: "Mittelfeldspieler. Punkte für Tore (+5), Assists (+3), Clean Sheet (+1)."
                },
                {
                    term: "FWD (Forward)",
                    definition: "Stürmer. Punkte für Tore (+4), Assists (+3). Keine Clean Sheet Punkte."
                }
            ]
        },
        {
            category: "Machine Learning",
            color: "fuchsia",
            icon: Cpu,
            entries: [
                {
                    term: "Random Forest",
                    definition: "Ensemble-Methode mit vielen Entscheidungsbäumen. Robust gegen Overfitting, gut für tabellarische Daten."
                },
                {
                    term: "Feature",
                    definition: "Merkmal/Variable im Modell (z.B. Form, Gegnerstärke, Minuten). Features = Input für Prognose."
                },
                {
                    term: "Feature Importance",
                    definition: "Wie wichtig ist ein Feature für die Prognose? Höhere Werte = grösserer Einfluss auf Vorhersage."
                },
                {
                    term: "Rolling Feature",
                    definition: "Wert über mehrere Spieltage (z.B. form_roll3 = Formdurchschnitt letzte 3 GWs)."
                },
                {
                    term: "MAE (Mean Absolute Error)",
                    definition: "Durchschnittliche absolute Abweichung zwischen Prognose und Realität. Niedriger = besser."
                },
                {
                    term: "RMSE (Root Mean Squared Error)",
                    definition: "Wurzel der quadratischen Abweichungen. Bestraft grosse Fehler stärker als MAE."
                },
                {
                    term: "Spearman Korrelation",
                    definition: "Misst Rangfolge-Übereinstimmung. +1 = perfekte Übereinstimmung, 0 = keine Korrelation."
                },
                {
                    term: "Cross-Validation",
                    definition: "Validierungstechnik: Modell wird auf mehreren Datensplit getestet um Overfitting zu vermeiden."
                },
                {
                    term: "Walk-Forward Validation",
                    definition: "Zeitbasierte Validierung: Training nur auf Vergangenheit, Test auf Zukunft. Verhindert Look-Ahead Bias."
                }
            ]
        },
        {
            category: "Feature-Namen",
            color: "violet",
            icon: Tag,
            entries: [
                {
                    term: "opponent_strength_defensive",
                    definition: "Defensive Stärke des Gegners (0-5). Hohe Werte = starke Defensive = weniger Tore/Assists erwartet."
                },
                {
                    term: "opponent_strength_offensive",
                    definition: "Offensive Stärke des Gegners (0-5). Hohe Werte = starker Angriff = weniger Clean Sheets für DEF/GK."
                },
                {
                    term: "_r3 / _roll3 Suffix",
                    definition: "Rolling Feature über 3 Gameweeks. Durchschnitt der letzten 3 Spieltage (z.B. points_r3 = Ø Punkte letzte 3 GWs). Verhindert Look-Ahead Bias, da nur Vergangenheit verwendet wird."
                },
                {
                    term: "minutes_roll3",
                    definition: "Durchschnittliche Einsatzminuten über letzte 3 Spieltage. Zeigt Stammplatz-Status."
                },
                {
                    term: "form_roll3",
                    definition: "Formdurchschnitt (Punkte pro Spiel) über letzte 3 Gameweeks."
                },
                {
                    term: "ict_index_roll3",
                    definition: "Rollierender ICT-Index über 3 GWs. Zeigt konstante Aktivität."
                },
                {
                    term: "was_home",
                    definition: "Heimspiel (1) oder Auswärtsspiel (0). Heimvorteil kann Performance beeinflussen."
                },
                {
                    term: "team_def_gk / team_def_non_gk",
                    definition: "Team-Defensivmetriken. Zeigen wie stark die gesamte Defensive ist (relevant für Clean Sheets)."
                },
                {
                    term: "chance_of_playing_next_round",
                    definition: "Wahrscheinlichkeit zu spielen (0-100%). Berücksichtigt Verletzungen/Sperren."
                }
            ]
        }
    ]

    const colorMap: Record<string, { border: string; bg: string; text: string; dot: string }> = {
        pink: {
            border: "border-pink-500/20",
            bg: "bg-pink-500/15",
            text: "text-pink-400",
            dot: "bg-pink-500"
        },
        purple: {
            border: "border-purple-500/20",
            bg: "bg-purple-500/15",
            text: "text-purple-400",
            dot: "bg-purple-500"
        },
        fuchsia: {
            border: "border-fuchsia-500/20",
            bg: "bg-fuchsia-500/15",
            text: "text-fuchsia-400",
            dot: "bg-fuchsia-500"
        },
        violet: {
            border: "border-violet-500/20",
            bg: "bg-violet-500/15",
            text: "text-violet-400",
            dot: "bg-violet-500"
        }
    }

    return (
        <>
            <Head>
                <title>Glossar - FPL Matura</title>
                <meta
                    name="description"
                    content="Begriffserklärungen zu FPL, Machine Learning und Feature-Namen"
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
                                Glossar
                            </h1>
                        </div>
                        <p className="text-slate-300 text-lg max-w-3xl mx-auto">
                            Erklärungen zu FPL-Begriffen, Machine-Learning-Metriken und Feature-Namen
                        </p>
                    </motion.div>

                    {/* Kategorien */}
                    {glossarEntries.map((category, idx) => (
                        <motion.div
                            key={category.category}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.1 + idx * 0.1 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center gap-3">
                                {(() => {
                                    const Icon = category.icon
                                    return <Icon className={`w-6 h-6 ${colorMap[category.color].text}`} />
                                })()}
                                <h2 className="text-2xl font-bold text-slate-100">{category.category}</h2>
                            </div>

                            <div className="grid md:grid-cols-2 gap-3">
                                {category.entries.map((entry, entryIdx) => (
                                    <div
                                        key={entryIdx}
                                        className={`bg-slate-800/90 ${colorMap[category.color].border} rounded-xl p-4 shadow-lg`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 ${colorMap[category.color].bg} rounded-lg flex-shrink-0`}>
                                                <div className={`w-2 h-2 rounded-full ${colorMap[category.color].dot}`}></div>
                                            </div>
                                            <div>
                                                <h3 className={`font-bold ${colorMap[category.color].text} mb-1`}>
                                                    {entry.term}
                                                </h3>
                                                <p className="text-sm text-slate-300">{entry.definition}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.main>
        </>
    )
}
