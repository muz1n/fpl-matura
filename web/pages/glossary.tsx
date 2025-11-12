import Head from 'next/head'
import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'
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

            <div className="space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center space-y-4"
                >
                    <div className="flex justify-center">
                        <div className="p-4 bg-gradient-to-br from-green-500 to-blue-600 rounded-full">
                            <BookOpen className="h-12 w-12 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                        Glossar
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Alle FPL-Begriffe einfach erklärt
                    </p>
                </motion.div>

                {/* Glossary Groups */}
                <div className="space-y-8">
                    {glossaryGroups.map((group, groupIndex) => (
                        <motion.section
                            key={group.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: groupIndex * 0.1 }}
                            className="space-y-4"
                        >
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {group.title}
                            </h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                {group.entries.map((entry, index) => (
                                    <motion.div
                                        key={entry.term}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.4, delay: (groupIndex * 0.1) + (index * 0.05) }}
                                        className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700"
                                    >
                                        <dt className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                            {entry.term}
                                        </dt>
                                        <dd className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                            {entry.definition}
                                        </dd>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.section>
                    ))}
                </div>

                {/* Info Box */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        Tipp
                    </h3>
                    <p className="text-blue-800 dark:text-blue-200">
                        Alle diese Begriffe findest du auch in der App mit einem kleinen <strong>?</strong>-Symbol.
                        Fahre einfach mit der Maus darüber, um eine kurze Erklärung zu sehen.
                    </p>
                </motion.div>
            </div>
        </>
    )
}
