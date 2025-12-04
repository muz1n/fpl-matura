import { useEffect, useState } from 'react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import { FeatureImportanceChart, FeatureImportanceRow } from '../src/components/FeatureImportanceChart'
import { getUsableSeasons } from '../src/lib/seasonQuality'
import { Select } from '../src/components/Select'
import { LoadingState, ErrorState } from '../src/components/States'
import { BrainCircuit, Info, Database } from 'lucide-react'

interface FIResponse {
    season: string
    method: string
    n_features: number
    generated_at: string
    features: FeatureImportanceRow[]
    position?: string | null
    fallback?: boolean
}

export default function FeatureImportancePage() {
    const [seasons, setSeasons] = useState<string[]>([])
    const [selectedSeason, setSelectedSeason] = useState<string>('2023-24')
    const [data, setData] = useState<FIResponse | null>(null)
    const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [error, setError] = useState<string>('')
    const [position, setPosition] = useState<string>('ALL')

    useEffect(() => {
        async function loadSeasons() {
            try {
                const s = await getUsableSeasons()
                setSeasons(s)
                if (!selectedSeason && s.length > 0) setSelectedSeason(s[s.length - 1])
            } catch {
                setSeasons(['2020-21', '2021-22', '2022-23', '2023-24'])
            }
        }
        loadSeasons()
    }, [])

    useEffect(() => {
        if (!selectedSeason) return
        async function fetchFI() {
            setState('loading'); setError('')
            try {
                const res = await fetch(`/api/feature-importance/${selectedSeason}/rf`)
                if (!res.ok) {
                    setError('Fehler'); setData(null); setState('error'); return;
                }
                const json: FIResponse = await res.json()
                setData(json); setState('success')
            } catch (e: any) {
                setError('Fehler'); setData(null); setState('error')
            }
        }
        fetchFI()
    }, [selectedSeason])

    return (
        <>
            <Head>
                <title>Feature Importances - FPL Matura</title>
            </Head>
            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="min-h-screen text-slate-100"
            >
                <div className="mx-auto px-4 pt-12 pb-16 space-y-6 max-w-7xl">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center space-y-3"
                    >
                        <div className="flex items-center justify-center gap-3">
                            <BrainCircuit className="w-10 h-10 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600" />
                            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                                Feature Importance
                            </h1>
                        </div>
                        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
                            Welche Merkmale beeinflussen die Vorhersagen am stärksten?
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="bg-slate-800/90 border border-pink-500/20 rounded-2xl p-6 shadow-lg"
                    >
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-2 text-sm text-slate-300">
                                <p>
                                    <strong>Die Balken zeigen, welche Merkmale der Random Forest als wichtig einstuft.</strong>
                                </p>
                                <p>
                                    Je höher der Balken, desto stärker beeinflusst dieses Merkmal die Vorhersage.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-slate-800/90 border border-pink-500/20 rounded-2xl p-6 shadow-lg"
                    >
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Saison</label>
                            <Select
                                label=""
                                options={seasons.map(s => ({ value: s, label: s }))}
                                value={selectedSeason}
                                onChange={setSelectedSeason}
                            />
                        </div>
                    </motion.div>

                    {state === 'loading' && <LoadingState message="Lade Daten..." />}
                    {state === 'error' && <ErrorState message={error} />}

                    {state === 'success' && data && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="space-y-6"
                        >
                            {/* Chart */}
                            <div className="bg-slate-800/90 border border-pink-500/20 rounded-2xl p-6 shadow-lg space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-slate-100">Feature Importance Plot</h2>
                                    <span className="text-xs text-slate-400">Saison {data.season}</span>
                                </div>
                                <div className="w-full h-[500px]">
                                    <FeatureImportanceChart
                                        data={data.features}
                                        topN={15}
                                        showCumulative={false}
                                        title=""
                                        height="100%"
                                    />
                                </div>
                            </div>

                            {/* Erklärungen */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Database className="w-5 h-5 text-pink-500" />
                                        <h3 className="text-lg font-semibold text-slate-100">Interpretation</h3>
                                    </div>
                                    <ul className="list-disc pl-5 space-y-2 text-sm text-slate-300">
                                        <li><strong>Hohe Wichtigkeit</strong> → Modell nutzt dieses Merkmal häufig für Entscheidungen (z.B. Preis als Proxy für Spielerqualität)</li>
                                        <li><strong>Rolling Features (_r3)</strong> → Durchschnitt über letzte 3 Spieltage. Verhindert Look-Ahead Bias (keine zukünftigen Daten)</li>
                                        <li><strong>Warum nur r3?</strong> → Diese Features wurden im Modelltraining verwendet. Andere wie Gegnerstärke sind implizit enthalten oder separat berechnet.</li>
                                        <li>Niedrige Importances können dennoch für Stabilität relevant sein</li>
                                    </ul>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Info className="w-5 h-5 text-purple-500" />
                                        <h3 className="text-lg font-semibold text-slate-100">Technische Limitationen</h3>
                                    </div>
                                    <div className="text-sm text-slate-300 space-y-2">
                                        <p>
                                            Random Forest Importances können bei hochkardinalen Features (viele verschiedene Werte)
                                            oder stark skalierten Merkmalen verzerrt sein.
                                        </p>
                                        <p className="text-xs bg-slate-900/60 border border-purple-500/20 rounded-lg p-2">
                                            <strong className="text-purple-400">Alternative Methoden:</strong><br />
                                            • <strong>Permutation Importances:</strong> Misst wie stark Performance sinkt, wenn ein Feature zufällig gemischt wird<br />
                                            • <strong>SHAP-Werte:</strong> Aus Spieltheorie - zeigt Beitrag jedes Features für einzelne Vorhersagen
                                        </p>
                                        <p>
                                            Für diese Maturaarbeit ist die Standard-Importance ausreichend für Transparenz und Modellverständnis.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.main>
        </>
    )
}
