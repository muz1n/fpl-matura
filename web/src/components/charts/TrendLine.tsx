import dynamic from 'next/dynamic'
import React from 'react'

// ECharts Wrapper nur im Client rendern (SSR deaktiviert)
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

export interface TrendLineProps {
    /** Array von Datenpunkten: { gw: number, value: number, label?: string } */
    data: Array<{ gw: number; value: number; label?: string }>
    /** Titel der Y-Achse (z.B. "Prognose", "MAE", "RMSE") */
    yAxisName?: string
    /** Höhe in px */
    height?: number
    /** Optional: Farbe der Linie (default: emerald-500) */
    lineColor?: string
}

/**
 * Liniendiagramm fuer Trends ueber Gameweeks (z.B. durchschnittliche Prognosen, Metriken).
 *
 * Docstring (Deutsch):
 * - Zweck: Visualisierung von Verlauf ueber mehrere GWs (z.B. Durchschnittsprognose, MAE/RMSE).
 * - Inputs: data (Array mit gw/value), yAxisName (Achsenbeschriftung), height, lineColor.
 * - Output: React-Komponente mit ECharts-Liniendiagramm.
 * - Hinweise: Dark-Mode adaptive Farben; SSR=false; alle Texte auf Deutsch.
 */
export function TrendLine({ data, yAxisName = 'Wert', height = 300, lineColor = '#10B981' }: TrendLineProps) {
    const isDark = true

    const xData = data.map((d) => `GW${d.gw}`)
    const yData = data.map((d) => d.value)

    const option = {
        grid: { left: 16, right: 16, top: 32, bottom: 32, containLabel: true },
        tooltip: {
            trigger: 'axis',
            formatter: (params: any) => {
                const p = Array.isArray(params) ? params[0] : params
                const idx = p.dataIndex
                const gw = data[idx]?.gw || '?'
                const val = Number(p.value).toFixed(2)
                const label = data[idx]?.label || yAxisName
                return `GW ${gw}<br/>${label}: <b>${val}</b>`
            },
        },
        xAxis: {
            type: 'category',
            data: xData,
            name: 'Spielwoche',
            nameLocation: 'middle',
            nameGap: 25,
            nameTextStyle: { color: isDark ? '#9CA3AF' : '#6B7280' },
            axisLine: { lineStyle: { color: isDark ? '#4B5563' : '#D1D5DB' } },
            axisTick: { lineStyle: { color: isDark ? '#4B5563' : '#D1D5DB' } },
            axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280' },
        },
        yAxis: {
            type: 'value',
            name: yAxisName,
            nameLocation: 'middle',
            nameGap: 50,
            nameTextStyle: { color: isDark ? '#9CA3AF' : '#6B7280' },
            axisLine: { lineStyle: { color: isDark ? '#4B5563' : '#D1D5DB' } },
            splitLine: { lineStyle: { color: isDark ? '#374151' : '#E5E7EB' } },
            axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280' },
        },
        series: [
            {
                name: yAxisName,
                type: 'line',
                data: yData,
                smooth: false,
                lineStyle: { color: lineColor, width: 2 },
                itemStyle: { color: lineColor },
                symbol: 'circle',
                symbolSize: 6,
            },
        ],
    }

    return <ReactECharts option={option as any} style={{ height }} notMerge lazyUpdate />
}

export default TrendLine
