import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'

export interface FeatureImportanceRow {
    feature: string
    importance: number
    rank: number
    cumulative: number
    normalized: number
}

interface FeatureImportanceChartProps {
    data: FeatureImportanceRow[]
    title?: string
    topN?: number
    height?: string
    showCumulative?: boolean
}

export function FeatureImportanceChart({
    data,
    title = 'Feature Importances',
    topN = 15,
    height = '520px',
    showCumulative = true
}: FeatureImportanceChartProps) {
    const option: EChartsOption = useMemo(() => {
        const sorted = [...data].sort((a, b) => a.rank - b.rank).slice(0, topN)
        const categories = sorted.map(r => r.feature)
        const importances = sorted.map(r => r.importance)
        const cumulative = sorted.map(r => r.cumulative)

        return {
            title: {
                text: title,
                left: 'center',
                textStyle: { fontSize: 18, fontWeight: 600 }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (params: any) => {
                    if (!params) return ''
                    const bar = params.find((p: any) => p.seriesType === 'bar')
                    const line = params.find((p: any) => p.seriesType === 'line')
                    const feat = bar?.name
                    const imp = bar?.value
                    const cum = line?.value
                    return `<div style="font-weight:600;margin-bottom:4px">${feat}</div>` +
                        `<div>Importance: <strong>${imp?.toFixed(4)}</strong></div>` +
                        (showCumulative ? `<div>Kumulativ: <strong>${cum?.toFixed(4)}</strong></div>` : '')
                }
            },
            grid: { left: 120, right: showCumulative ? 80 : 40, top: 60, bottom: 60 },
            xAxis: [{
                type: 'value',
                name: 'Importance',
                nameLocation: 'middle',
                nameGap: 35,
                axisLabel: { formatter: (v: number) => v.toFixed(3) },
                splitLine: { lineStyle: { color: '#334155', opacity: 0.3 } }
            },
            ...(showCumulative ? [{
                type: 'value' as const,
                name: 'Kumulativ (%)',
                nameLocation: 'end' as const,
                min: 0,
                max: 100,
                position: 'top' as const,
                axisLabel: {
                    formatter: (v: number) => `${v.toFixed(0)}%`,
                    color: '#a855f7'
                },
                splitLine: { show: false },
                axisLine: { lineStyle: { color: '#a855f7' } }
            }] : [])] as any,
            yAxis: {
                type: 'category',
                data: categories,
                inverse: true,
                axisLabel: {
                    formatter: (name: string) => name,
                    fontSize: 11,
                    color: '#cbd5e1'
                },
                axisLine: { lineStyle: { color: '#475569' } }
            },
            series: [
                {
                    name: 'Importance',
                    type: 'bar',
                    data: importances,
                    itemStyle: {
                        color: (params: any) => {
                            const t = params.dataIndex / Math.max(sorted.length - 1, 1)
                            // Gradient von Pink nach Purple (konsistent mit anderen Pages)
                            const r1 = 236, g1 = 72, b1 = 153  // pink-500 #ec4899
                            const r2 = 139, g2 = 92, b2 = 246  // purple-600 #8b5cf6
                            const r = Math.round(r1 + (r2 - r1) * t)
                            const g = Math.round(g1 + (g2 - g1) * t)
                            const b = Math.round(b1 + (b2 - b1) * t)
                            return `rgb(${r},${g},${b})`
                        }
                    }
                },
                ...(showCumulative ? [{
                    name: 'Kumulativ',
                    type: 'line',
                    data: cumulative,
                    xAxisIndex: 1,
                    yAxisIndex: 0,
                    lineStyle: { width: 3, color: '#a855f7' }, // purple-500
                    symbol: 'circle',
                    symbolSize: 7,
                    itemStyle: { color: '#a855f7' },
                    smooth: true
                } as any] : [])
            ],
            toolbox: {
                feature: {
                    saveAsImage: { title: 'Speichern', pixelRatio: 2 },
                    dataZoom: {},
                    restore: {}
                },
                right: 20,
                top: 10
            },
            dataZoom: [
                { type: 'inside', yAxisIndex: 0 },
                { type: 'slider', yAxisIndex: 0, right: showCumulative ? 10 : 0 }
            ]
        }
    }, [data, title, topN, showCumulative])

    return <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'svg' }} />
}
