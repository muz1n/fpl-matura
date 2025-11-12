import Head from 'next/head'
import { motion } from 'framer-motion'
import { Users, Trophy, TrendingUp, Save, Upload, Trash2 } from 'lucide-react'
import * as React from 'react'

export default function TeamPage() {
    const TEAM_ID_KEY = 'fpl_team_id'
    const [teamIdInput, setTeamIdInput] = React.useState<string>('')

    React.useEffect(() => {
        if (typeof window === 'undefined') return
        const saved = localStorage.getItem(TEAM_ID_KEY)
        if (saved) setTeamIdInput(saved)
    }, [])

    const saveTeamId = () => {
        if (typeof window === 'undefined') return
        localStorage.setItem(TEAM_ID_KEY, teamIdInput.trim())
    }
    const loadTeamId = () => {
        if (typeof window === 'undefined') return
        const saved = localStorage.getItem(TEAM_ID_KEY) || ''
        setTeamIdInput(saved)
    }
    const clearTeamId = () => {
        if (typeof window === 'undefined') return
        localStorage.removeItem(TEAM_ID_KEY)
        setTeamIdInput('')
    }
    return (
        <>
            <Head>
                <title>Team — FPL Assistent</title>
                <meta name="description" content="Verwalte dein Fantasy Premier League Team" />
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
                            <Users className="h-12 w-12 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                        Dein Team
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Teamverwaltung und Analysen kommen bald. Du kannst bereits deine FPL Team-ID speichern.
                    </p>
                </motion.div>

                {/* FPL Team-ID (Platzhalter, keine echten Logins) */}
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">FPL Team-ID</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Platzhalter: Speichere deine FPL Team-ID lokal. Keine Logins, keine externen Anfragen.</p>
                    <div className="grid md:grid-cols-[1fr_auto] gap-3 items-center">
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={teamIdInput}
                            onChange={(e) => setTeamIdInput(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="z.B. 1234567"
                            aria-label="FPL Team-ID"
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={saveTeamId} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900" aria-label="Team-ID speichern">
                                <Save className="w-4 h-4" /> Speichern
                            </button>
                            <button onClick={loadTeamId} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900" aria-label="Team-ID laden">
                                <Upload className="w-4 h-4" /> Laden
                            </button>
                            <button onClick={clearTeamId} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900" aria-label="Team-ID löschen">
                                <Trash2 className="w-4 h-4" /> Löschen
                            </button>
                        </div>
                    </div>
                </div>

                {/* Coming Soon Cards */}
                <div className="grid md:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                    >
                        <Trophy className="h-8 w-8 text-yellow-500 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Teamanalyse
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Detaillierte Statistiken und Performance-Metriken deines Teams
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                    >
                        <TrendingUp className="h-8 w-8 text-green-500 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Transfer-Tipps
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            KI-gestützte Empfehlungen für optimale Transfers
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                    >
                        <Users className="h-8 w-8 text-blue-500 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Spielervergleich
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Vergleiche Spieler und finde die besten Optionen
                        </p>
                    </motion.div>
                </div>

                {/* Info Box */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        In Entwicklung
                    </h3>
                    <p className="text-blue-800 dark:text-blue-200">
                        Die Teamverwaltung wird in einer zukünftigen Version verfügbar sein.
                        Aktuell kannst du bereits Prognosen für alle Spieler einsehen.
                    </p>
                </motion.div>
            </div>
        </>
    )
}
