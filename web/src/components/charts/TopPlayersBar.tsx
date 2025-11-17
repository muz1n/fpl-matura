import dynamic from 'next/dynamic'
import type { PredictionPlayer } from '@/src/types/fpl.schema'
import React from 'react'

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
      axisLine: { lineStyle: { color: '#9CA3AF' } },
      splitLine: { lineStyle: { color: '#E5E7EB' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: top.map((p) => p.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        formatter: (val: string) => (val.length > 18 ? val.slice(0, 17) + '…' : val),
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
          color: '#374151',
          formatter: (v: any) => Number(v.value).toFixed(1),
        },
      },
    ],
  }

  return <ReactECharts option={option as any} style={{ height }} notMerge lazyUpdate />
}

export default TopPlayersBar
