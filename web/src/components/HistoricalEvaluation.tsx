/**
 * HistoricalEvaluation Component
 * 
 * Zeigt Vergleich zwischen Modell-Lineup und optimalem Lineup für historische GWs.
 * Wird nur für Seasons 2020-21 bis 2023-24 angezeigt (Datenqualität).
 * 
 * Verwendung in Maturaarbeit:
 * - Zeigt Performance des ML-Modells gegen theoretisches Optimum
 * - Validiert ob Vorhersagen besser als Zufall sind
 * - Ermöglicht Vergleich verschiedener Methoden
 */

import React, { useEffect, useState } from 'react';

interface LineupPlayer {
    player_id: number;
    name: string;
    pos: string;
    team: string;
    price: number;
}

interface EvaluationData {
    evaluation_possible: boolean;
    error_message?: string;
    season?: string;
    gw?: number;
    methode?: string;
    model_lineup?: {
        xi_ids: number[];
        formation: string;
        captain_id?: number;
        total_cost: number;
    };
    model_actual_points?: number;
    optimal_lineup?: {
        xi_ids: number[];
        formation: string;
        captain_id?: number;
        total_cost: number;
    };
    optimal_points?: number;
    delta?: number;
    efficiency_percent?: number;
}

interface HistoricalEvaluationProps {
    season: string;
    gw: number;
    methode?: string;
}

export function HistoricalEvaluation({ season, gw, methode = 'rf' }: HistoricalEvaluationProps) {
    const [data, setData] = useState<EvaluationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchEvaluation() {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/eval/${season}/${gw}?methode=${methode}`);
                const result: EvaluationData = await response.json();

                setData(result);

                if (!result.evaluation_possible) {
                    setError(result.error_message || 'Evaluation nicht möglich');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
            } finally {
                setLoading(false);
            }
        }

        fetchEvaluation();
    }, [season, gw, methode]);

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">📊 Historische Evaluation</h3>
                <p className="text-gray-600">Lade Evaluation...</p>
            </div>
        );
    }

    if (error || !data || !data.evaluation_possible) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2 text-yellow-800">ℹ️ Keine Evaluation verfügbar</h3>
                <p className="text-yellow-700">
                    {error || 'Unzureichende Datenqualität für diese Season'}
                </p>
                <p className="text-sm text-yellow-600 mt-2">
                    Evaluation ist nur für Seasons 2020-21 bis 2023-24 verfügbar.
                </p>
            </div>
        );
    }

    const { model_actual_points, optimal_points, delta, efficiency_percent } = data;

    // Delta-Farbcodierung
    const getDeltaColor = (deltaValue: number) => {
        if (deltaValue >= -5) return 'text-green-600'; // Sehr gut
        if (deltaValue >= -15) return 'text-yellow-600'; // Okay
        return 'text-red-600'; // Verbesserungsbedarf
    };

    const getEfficiencyColor = (eff: number) => {
        if (eff >= 90) return 'bg-green-100 text-green-800';
        if (eff >= 75) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h3 className="text-xl font-bold mb-4">📊 Historische Evaluation</h3>
            <p className="text-sm text-gray-600 mb-4">
                Vergleich des Modell-Lineups mit dem optimal möglichen Lineup (basierend auf tatsächlichen Punkten).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Modell-Lineup Punkte */}
                <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-blue-600 font-medium mb-1">🤖 Modell-Lineup</div>
                    <div className="text-3xl font-bold text-blue-900">
                        {model_actual_points?.toFixed(1)} Pkt
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                        Formation: {data.model_lineup?.formation}
                    </div>
                </div>

                {/* Optimales Lineup Punkte */}
                <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-green-600 font-medium mb-1">🏆 Optimales Lineup</div>
                    <div className="text-3xl font-bold text-green-900">
                        {optimal_points?.toFixed(1)} Pkt
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                        Formation: {data.optimal_lineup?.formation}
                    </div>
                </div>

                {/* Delta */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 font-medium mb-1">📉 Differenz</div>
                    <div className={`text-3xl font-bold ${getDeltaColor(delta || 0)}`}>
                        {delta !== undefined && delta >= 0 && '+'}
                        {delta?.toFixed(1)} Pkt
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                        Modell - Optimal
                    </div>
                </div>
            </div>

            {/* Effizienz-Anzeige */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Effizienz</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getEfficiencyColor(efficiency_percent || 0)}`}>
                        {efficiency_percent?.toFixed(1)}%
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(efficiency_percent || 0, 100)}%` }}
                    />
                </div>
            </div>

            {/* Interpretation */}
            <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">💡 Interpretation</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                    <li>
                        <strong>Modell-Lineup:</strong> Punkte die dein ML-Modell mit seinen Vorhersagen erreicht hätte
                    </li>
                    <li>
                        <strong>Optimales Lineup:</strong> Maximum erreichbare Punkte mit perfektem Hindsight (kennt echte Punkte)
                    </li>
                    <li>
                        <strong>Effizienz:</strong> Wie nah das Modell am theoretischen Optimum ist
                        {efficiency_percent && efficiency_percent >= 90 && ' (Sehr gut! 🎉)'}
                        {efficiency_percent && efficiency_percent >= 75 && efficiency_percent < 90 && ' (Solide Leistung)'}
                        {efficiency_percent && efficiency_percent < 75 && ' (Verbesserungspotenzial)'}
                    </li>
                </ul>
            </div>

            {/* Info für Maturaarbeit */}
            <div className="mt-4 text-xs text-gray-500 border-t pt-3">
                <strong>Hinweis für Maturaarbeit:</strong> Das optimale Lineup ist nur theoretisch erreichbar,
                da es die tatsächlichen Punktzahlen bereits kennt. Ein Modell mit 80-90% Effizienz gilt als sehr erfolgreich,
                da es nur auf Vorhersagen basiert (keine perfekte Information).
            </div>
        </div>
    );
}

export default HistoricalEvaluation;
