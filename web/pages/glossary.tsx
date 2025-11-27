import Head from 'next/head'
import { motion } from 'framer-motion'
import { glossary } from '../src/data/glossary'

// Gruppierung der Glossar-Begriffe
const glossaryGroups = [
    {
        title: 'Modelle & Methoden',
        entries: [
            { term: 'Random Forest', definition: glossary.randomForest },
            { term: 'Formdurchschnitt', definition: glossary.formdurchschnitt },
            { term: 'Positionsmittel', definition: glossary.positionsmittel },
            { term: 'Prognose', definition: glossary.prognose },
            { term: 'Modell-Version', definition: glossary.modellVersion },
        ]
    },
    {
        title: 'FPL Grundlagen',
        entries: [
            { term: 'Gameweek', definition: glossary.gameweek },
            { term: 'Kapitän', definition: glossary.captain },
            { term: 'Vize-Kapitän', definition: glossary.viceCaptain },
            { term: 'Startelf', definition: glossary.startelf },
            { term: 'Bank', definition: glossary.bank },
            { term: 'Formation', definition: glossary.formation },
            { term: 'Transfer', definition: glossary.transfer },
            { term: 'Budget', definition: glossary.budget },
        ]
    },
    {
        title: 'Positionen',
        entries: [
            { term: 'Torwart (GK)', definition: glossary.torwart },
            { term: 'Verteidiger (DEF)', definition: glossary.verteidiger },
            { term: 'Mittelfeld (MID)', definition: glossary.mittelfeld },
            { term: 'Sturm (FWD)', definition: glossary.sturm },
        ]
    },
    {
        title: 'Spielstatistiken',
        entries: [
            { term: 'Erwartete Punkte', definition: glossary.erwartePunkte },
            { term: 'Clean Sheet', definition: glossary.cleanSheet },
            { term: 'Heimspiel', definition: glossary.heimspiel },
            { term: 'Auswärtsspiel', definition: glossary.auswaertsspiel },
            { term: 'Preis', definition: glossary.preis },
        ]
    },
    {
        title: 'Technisches',
        entries: [
            { term: 'Regelprüfung', definition: glossary.regelPruefung },
        ]
    }
]

export default function GlossaryPage() {
    return (
        <>
            <Head>
                <title>Glossar — FPL Assistent</title>
                <meta name="description" content="Alle FPL-Begriffe einfach erklärt" />
            </Head>
            <main className="min-h-screen bg-slate-900 text-slate-100">
                <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                    <div className="bg-slate-800/90 border border-slate-700 text-slate-100 px-6 py-4 rounded-2xl mb-8 text-center text-sm md:text-base">
                        Das Glossar ist Teil der Dokumentation und unter <a href="/info" className="underline text-emerald-400 hover:text-emerald-300">Info</a> verlinkt.
                    </div>
                    {/* Glossar bleibt für die Dokumentation erhalten */}
                    <div className="space-y-8">
                        {glossaryGroups.map((group, groupIndex) => (
                            <motion.section
                                key={group.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: groupIndex * 0.1 }}
                                className="space-y-4"
                            >
                                <h2 className="text-2xl font-bold text-slate-100">
                                    {group.title}
                                </h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {group.entries.map((entry, index) => (
                                        <motion.div
                                            key={entry.term}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.4, delay: (groupIndex * 0.1) + (index * 0.05) }}
                                            className="p-4 bg-slate-800/90 rounded-2xl shadow border border-slate-700"
                                        >
                                            <dt className="text-sm md:text-base font-semibold text-slate-100 mb-1">
                                                {entry.term}
                                            </dt>
                                            <dd className="text-xs md:text-sm text-slate-300 leading-relaxed">
                                                {entry.definition}
                                            </dd>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.section>
                        ))}
                    </div>
                </div>
            </main>
        </>
    )
}
