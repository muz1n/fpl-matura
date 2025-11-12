import { useEffect, useState } from 'react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import { Select } from '@/src/components/Select'
import { LoadingState, ErrorState, EmptyState } from '@/src/components/States'
import type { PredictionsPayload, PredictionPlayer } from '@/types/fpl'

interface HistoricalResponse {
    mode: 'historical'
    demo: boolean
    season: string
    gw: number
    data: PredictionsPayload
}

const seasonOptions = [
    { value: '2022-23', label: 'Saison 2022-23' },
    { value: '2023-24', label: 'Saison 2023-24' },
    { value: '2024-25', label: 'Saison 2024-25' },
]

const gwOptions = Array.from({ length: 38 }, (_, i) => ({ value: i + 1, label: `GW ${i + 1}` }))

type LoadingStateType = 'idle' | 'loading' | 'success' | 'error'

export default function HistorischPage() {
    const [season, setSeason] = useState<string>('2023-24')
    const [gw, setGw] = useState<number>(1)
    const [state, setState] = useState<LoadingStateType>('idle')
    const [error, setError] = useState<string>('')
    const [payload, setPayload] = useState<PredictionsPayload | null>(null)

    useEffect(() => {
        async function load() {
            setState('loading')
            setError('')
            setPayload(null)
            try {
                const res = await fetch(`/api/historical?season=${encodeURIComponent(season)}&gw=${gw}`)
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}))
                    throw new Error(errData.error || 'Fehler beim Laden historischer Daten')
                }
                const data: HistoricalResponse = await res.json()
                setPayload(data.data)
                setState('success')
            } catch (e: any) {
                setError(e?.message || 'Unbekannter Fehler')
                setState('error')
            }
        }
        load()
    }, [season, gw])

    const topPlayers = (limit = 20): PredictionPlayer[] => {
        if (!payload) return []
        return [...payload.players]
            .sort((a, b) => b.predicted_points - a.predicted_points)
            .slice(0, limit)
    }

    if (state === 'loading') {
        return (
            <>
                <Head><title>Historisch — FPL Assistent</title></Head>
                <LoadingState message="Lade historische Daten..." />
            </>
        )
    }
    if (state === 'error') {
        return (
            <>
                <Head><title>Historisch — FPL Assistent</title></Head>
                <ErrorState message={error} onRetry={() => { setSeason('2023-24'); setGw(1) }} />
            </>
        )
    }
    if (!payload) {
        return (
            <>
                <Head><title>Historisch — FPL Assistent</title></Head>
                <EmptyState />
            </>
        )
    }

    return (
        <>
            <Head><title>Historischer Demo-Modus — FPL Assistent</title></Head>
            <div className="space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700"
                >
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Historischer Demo-Modus</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Demo-Modus mit historischen Daten. Wähle Saison & Spielwoche, um frühere Prognosen zu betrachten.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Saison"
                            value={season}
                            onChange={(val) => setSeason(val as string)}
                            options={seasonOptions}
                        />
                        <Select
                            label="Spielwoche"
                            value={gw}
                            onChange={(val) => setGw(Number(val))}
                            options={gwOptions}
                        />
                    </div>
                </motion.div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white inline-flex items-center">
                            Prognosen Übersicht
                        </h2>
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Saison {payload.season} • GW {payload.gw} • Modell {payload.model_version}</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Rang</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Spieler</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Team</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Position</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Gegner</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Prognose</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Preis</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {topPlayers(30).map((p, idx) => (
                                    <tr key={p.player_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-400">#{idx + 1}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{p.team}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${p.pos === 'GK' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                        ${p.pos === 'DEF' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                        ${p.pos === 'MID' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                        ${p.pos === 'FWD' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
                      `}>{p.pos}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{p.is_home ? 'vs' : '@'} {p.opponent}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900 dark:text-white">{p.predicted_points.toFixed(1)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600 dark:text-gray-400">£{p.price.toFixed(1)}m</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    )
}
