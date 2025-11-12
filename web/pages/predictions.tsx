import { useEffect, useState } from 'react'
import Head from 'next/head'
import type { PredictionsPayload, LineupPayload, PredictionPlayer } from '../types/fpl'

type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export default function PredictionsPage() {
    const [predictions, setPredictions] = useState<PredictionsPayload | null>(null)
    const [lineup, setLineup] = useState<LineupPayload | null>(null)
    const [state, setState] = useState<LoadingState>('idle')
    const [error, setError] = useState<string>('')

    useEffect(() => {
        async function fetchData() {
            setState('loading')
            try {
                const [predRes, lineupRes] = await Promise.all([
                    fetch('/api/gw/38/predictions'),
                    fetch('/api/gw/38/lineup')
                ])

                if (!predRes.ok || !lineupRes.ok) {
                    throw new Error('Failed to fetch data')
                }

                const predData: PredictionsPayload = await predRes.json()
                const lineupData: LineupPayload = await lineupRes.json()

                setPredictions(predData)
                setLineup(lineupData)
                setState('success')
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error')
                setState('error')
            }
        }

        fetchData()
    }, [])

    // Helper: find player by ID
    const findPlayer = (id: number): PredictionPlayer | undefined => {
        return predictions?.players.find(p => p.player_id === id)
    }

    // Helper: get XI players sorted by position then points
    const getXIPlayers = (): PredictionPlayer[] => {
        if (!lineup || !predictions) return []

        const posOrder = { GK: 0, DEF: 1, MID: 2, FWD: 3 }
        const xiPlayers = lineup.xi_ids
            .map(findPlayer)
            .filter((p): p is PredictionPlayer => p !== undefined)

        return xiPlayers.sort((a, b) => {
            const posCompare = posOrder[a.pos] - posOrder[b.pos]
            if (posCompare !== 0) return posCompare
            return b.predicted_points - a.predicted_points
        })
    }

    // Helper: get top 15 predicted players overall
    const getTop15Players = (): PredictionPlayer[] => {
        if (!predictions) return []
        return [...predictions.players]
            .sort((a, b) => b.predicted_points - a.predicted_points)
            .slice(0, 15)
    }

    if (state === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-lg text-slate-600">Loading predictions...</div>
            </div>
        )
    }

    if (state === 'error') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="max-w-md p-6 bg-white rounded shadow">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
                    <p className="text-slate-700">{error}</p>
                </div>
            </div>
        )
    }

    if (!predictions || !lineup) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-lg text-slate-600">No data available</div>
            </div>
        )
    }

    const captainPlayer = findPlayer(lineup.captain_id)
    const vicePlayer = findPlayer(lineup.vice_id)
    const xiPlayers = getXIPlayers()
    const top15 = getTop15Players()

    return (
        <div className="min-h-screen bg-slate-50">
            <Head>
                <title>FPL Predictions — GW{lineup.gw}</title>
            </Head>

            <main className="max-w-6xl mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        FPL Predictions & Lineup
                    </h1>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                        <span>Season: <strong>{predictions.season}</strong></span>
                        <span>•</span>
                        <span>Gameweek: <strong>{lineup.gw}</strong></span>
                        <span>•</span>
                        <span>Model: <strong>{lineup.model_version}</strong></span>
                        <span>•</span>
                        <span>Generated: <strong>{new Date(lineup.generated_at).toLocaleString()}</strong></span>
                    </div>
                </div>

                {/* Lineup Summary */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Lineup Summary</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <div className="text-sm text-slate-600">Formation</div>
                            <div className="text-xl font-semibold text-slate-900">{lineup.formation}</div>
                        </div>
                        <div>
                            <div className="text-sm text-slate-600">Captain</div>
                            <div className="text-xl font-semibold text-slate-900">
                                {captainPlayer?.name || `ID ${lineup.captain_id}`}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-slate-600">Vice Captain</div>
                            <div className="text-xl font-semibold text-slate-900">
                                {vicePlayer?.name || `ID ${lineup.vice_id}`}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-slate-600">Starting XI Count</div>
                            <div className="text-xl font-semibold text-slate-900">{lineup.xi_ids.length}</div>
                        </div>
                        <div>
                            <div className="text-sm text-slate-600">Expected Points (XI)</div>
                            <div className="text-xl font-semibold text-emerald-600">
                                {lineup.xi_points_sum.toFixed(1)}
                            </div>
                        </div>
                        {lineup.debug?.rules_ok !== undefined && (
                            <div>
                                <div className="text-sm text-slate-600">Rules Check</div>
                                <div className={`text-xl font-semibold ${lineup.debug.rules_ok ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {lineup.debug.rules_ok ? '✓ Valid' : '✗ Invalid'}
                                </div>
                            </div>
                        )}
                    </div>
                    {lineup.debug?.notes && (
                        <div className="mt-4 p-3 bg-slate-50 rounded text-sm text-slate-700">
                            <strong>Notes:</strong> {lineup.debug.notes}
                        </div>
                    )}
                </div>

                {/* Starting XI Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-2xl font-bold text-slate-900">Starting XI</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Player
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Team
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Pos
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Opponent
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Predicted Points
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Role
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {xiPlayers.map((player) => {
                                    const isCaptain = player.player_id === lineup.captain_id
                                    const isVice = player.player_id === lineup.vice_id
                                    return (
                                        <tr key={player.player_id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-slate-900">{player.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {player.team}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${player.pos === 'GK' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${player.pos === 'DEF' ? 'bg-blue-100 text-blue-800' : ''}
                          ${player.pos === 'MID' ? 'bg-green-100 text-green-800' : ''}
                          ${player.pos === 'FWD' ? 'bg-red-100 text-red-800' : ''}
                        `}>
                                                    {player.pos}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {player.is_home ? 'vs' : '@'} {player.opponent}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-slate-900">
                                                {player.predicted_points.toFixed(1)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                                {isCaptain && <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-semibold text-xs">C</span>}
                                                {isVice && <span className="inline-flex items-center px-2 py-1 rounded bg-sky-100 text-sky-800 font-semibold text-xs">VC</span>}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bench */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-3">Bench</h2>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                            <div>
                                <span className="font-medium text-slate-900">GK: </span>
                                <span className="text-slate-700">{findPlayer(lineup.bench_gk_id)?.name || `ID ${lineup.bench_gk_id}`}</span>
                            </div>
                            <span className="text-sm text-slate-600">
                                {findPlayer(lineup.bench_gk_id)?.predicted_points.toFixed(1)} pts
                            </span>
                        </div>
                        {lineup.bench_out_ids.map((id, idx) => {
                            const player = findPlayer(id)
                            return (
                                <div key={id} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                                    <div>
                                        <span className="font-medium text-slate-900">B{idx + 1}: </span>
                                        <span className="text-slate-700">{player?.name || `ID ${id}`}</span>
                                        {player && <span className="ml-2 text-xs text-slate-500">({player.pos})</span>}
                                    </div>
                                    <span className="text-sm text-slate-600">
                                        {player?.predicted_points.toFixed(1)} pts
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Top 15 Predictions */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-2xl font-bold text-slate-900">Top 15 Predicted Players</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Rank
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Player
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Team
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Pos
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Opponent
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Predicted Points
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Price
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {top15.map((player, idx) => (
                                    <tr key={player.player_id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">
                                            #{idx + 1}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-slate-900">{player.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {player.team}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${player.pos === 'GK' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${player.pos === 'DEF' ? 'bg-blue-100 text-blue-800' : ''}
                        ${player.pos === 'MID' ? 'bg-green-100 text-green-800' : ''}
                        ${player.pos === 'FWD' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                                                {player.pos}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {player.is_home ? 'vs' : '@'} {player.opponent}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-slate-900">
                                            {player.predicted_points.toFixed(1)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-600">
                                            £{player.price.toFixed(1)}m
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Back link */}
                <div className="text-center py-4">
                    <a href="/" className="text-sky-600 hover:text-sky-700 font-medium">
                        ← Back to home
                    </a>
                </div>
            </main>
        </div>
    )
}
