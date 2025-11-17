import dynamic from 'next/dynamic'
import type { PredictionPlayer } from '@/src/types/fpl.schema'
import React from 'react'
import { useTheme } from 'next-themes'

// ECharts Wrapper nur im Client rendern (SSR deaktiviert)
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

export interface TopPlayersBarProps {
    players: PredictionPlayer[]
    limit?: number
    height?: number
}

/**
 * Balken-Diagramm fuer Top-Spieler nach prognostizierten Punkten.
 *
 * Docstring (Deutsch):
 * - Zweck: Kompakte Visualisierung der Top-N Spieler nach predicted_points.
 * - Inputs: players (Array von PredictionPlayer), limit (Default 15), height (px).
 * - Output: React-Komponente mit ECharts-Optionen.
 * - Hinweise: Rendert nur im Client (SSR=false). Alle Laufzeittexte auf Deutsch.
 */
export function TopPlayersBar({ players, limit = 15, height = 360 }: TopPlayersBarProps) {
    const { resolvedTheme } = useTheme()
    const isDark = resolvedTheme === 'dark'

    const top = [...players]
        .sort((a, b) => b.predicted_points - a.predicted_points)
        .slice(0, limit)

    const option = {
        grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params: any) => {
                const p = Array.isArray(params) ? params[0] : params
                return `${p.name}<br/>Prognose: <b>${Number(p.value).toFixed(1)}</b> Punkte`
            },
        },
        xAxis: {
            type: 'value',
            name: 'Punkte',
            nameTextStyle: { color: isDark ? '#9CA3AF' : '#6B7280' },
            axisLine: { lineStyle: { color: isDark ? '#4B5563' : '#D1D5DB' } },
            splitLine: { lineStyle: { color: isDark ? '#374151' : '#E5E7EB' } },
            axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280' },
        },
        yAxis: {
            type: 'category',
            inverse: true,
            data: top.map((p) => p.name),
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                formatter: (val: string) => (val.length > 18 ? val.slice(0, 17) + '…' : val),
                color: isDark ? '#D1D5DB' : '#374151',
            },
        },
        series: [
            {
                name: 'Prognose',
                type: 'bar',
                data: top.map((p) => p.predicted_points),
                itemStyle: { color: '#10B981' }, // emerald-500
                label: {
                    show: true,
                    position: 'right',
                    color: isDark ? '#D1D5DB' : '#374151',
                    formatter: (v: any) => Number(v.value).toFixed(1),
                },
            },
        ],
    }

    return <ReactECharts option={option as any} style={{ height }} notMerge lazyUpdate />
}

export default TopPlayersBar
