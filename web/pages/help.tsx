import Head from 'next/head'
import { motion } from 'framer-motion'
import { HelpCircle, Book, LineChart, Lightbulb, ExternalLink } from 'lucide-react'
import { HelpIcon } from '../src/components/HelpIcon'
import { glossary } from '../src/data/glossary'

const helpSections = [
    {
        icon: Book,
        title: 'Was ist FPL?',
        content: 'Fantasy Premier League (FPL) ist das offizielle Fantasy-Football-Spiel der Premier League. Du stellst ein virtuelles Team aus echten Premier League Spielern zusammen und sammelst Punkte basierend auf deren realen Leistungen.',
        tooltip: 'FPL ist ein kostenloses Online-Spiel, bei dem du als Manager agierst.'
    },
    {
        icon: LineChart,
        title: 'Wie funktionieren die Prognosen?',
        content: 'Unsere KI-Modelle analysieren historische Spielerdaten, Form, Gegnerstatistiken und weitere Faktoren, um präzise Punktvorhersagen für jede Gameweek zu erstellen. Die Prognosen basieren auf Random Forest Algorithmen.',
        tooltip: glossary.randomForest
    },
    {
        icon: Lightbulb,
        title: 'Tipps für bessere Ergebnisse',
        content: 'Nutze die Prognosen als Entscheidungshilfe, aber berücksichtige auch aktuelle News wie Verletzungen oder Formwechsel. Diversifiziere dein Team und achte auf das Budget.',
        tooltip: glossary.budget
    },
]

const faqs = [
    {
        question: 'Wie genau sind die Vorhersagen?',
        answer: 'Die Modelle werden kontinuierlich mit aktuellen Daten trainiert und erreichen eine solide Vorhersagegenauigkeit. Beachte jedoch, dass Fußball unvorhersehbar ist – nutze die Prognosen als Hilfestellung, nicht als Garantie.',
    },
    {
        question: 'Wie oft werden die Daten aktualisiert?',
        answer: 'Die Vorhersagen werden vor jeder Gameweek aktualisiert, sobald die Teams und Aufstellungen feststehen.',
    },
    {
        question: 'Kann ich mein eigenes Team importieren?',
        answer: 'Diese Funktion ist für eine zukünftige Version geplant. Aktuell kannst du die Prognosen nutzen, um manuelle Entscheidungen zu treffen.',
    },
]

export default function HelpPage() {
    return (
        <>
            <Head>
                <title>Hilfe — FPL Assistent</title>
                <meta name="description" content="Hilfe und Informationen zum FPL Assistenten" />
            </Head>

            <div className="space-y-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center space-y-4"
                >
                    <div className="flex justify-center">
                        <div className="p-4 bg-gradient-to-br from-green-500 to-blue-600 rounded-full">
                            <HelpCircle className="h-12 w-12 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                        Hilfe & Informationen
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Alles, was du über den FPL Assistenten wissen musst
                    </p>
                </motion.div>

                {/* Help Sections */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Grundlagen
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {helpSections.map((section, index) => {
                            const Icon = section.icon
                            return (
                                <motion.div
                                    key={section.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                                >
                                    <Icon className="h-8 w-8 text-green-500 mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 inline-flex items-center">
                                        {section.title}
                                        <HelpIcon text={section.tooltip} />
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                        {section.content}
                                    </p>
                                </motion.div>
                            )
                        })}
                    </div>
                </section>

                {/* FAQs */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Häufige Fragen
                    </h2>
                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                            >
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    {faq.question}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {faq.answer}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* External Resources */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="p-6 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg text-white"
                >
                    <div className="flex items-start space-x-4">
                        <ExternalLink className="h-6 w-6 mt-1 flex-shrink-0" />
                        <div>
                            <h3 className="text-xl font-semibold mb-2">
                                Offizielle FPL Website
                            </h3>
                            <p className="mb-4 opacity-90">
                                Besuche die offizielle Fantasy Premier League Website für Regeln,
                                News und um dein Team zu verwalten.
                            </p>
                            <a
                                href="https://fantasy.premierleague.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-2 px-4 py-2 bg-white text-green-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <span>Zur FPL Website</span>
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    </div>
                </motion.section>
            </div>
        </>
    )
}
