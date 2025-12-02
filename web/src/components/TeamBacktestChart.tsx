import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'

interface BacktestDetailRow {
    method: string
    gw: number
    formation: string
    xi_points: number
    captain_id: number | null
    vice_id: number | null
    n_truth_matched: number
    n_candidates: number
    budget_used?: number
    notes: string
}

interface TeamBacktestChartProps {
    data: BacktestDetailRow[]
    title?: string
    height?: string
    showLegend?: boolean
}

// Farbschema für Methoden - HOHER KONTRAST für bessere Unterscheidbarkeit in Charts/Tabellen
const METHOD_COLORS: Record<string, string> = {
    rf: '#ec4899',         // Pink-500 (Hauptmodell)
    rf_pos: '#22c55e',     // Green-500 (hoher Kontrast zu Pink)
    rf_rank: '#f97316',    // Orange-500 (hoher Kontrast)
    rf_relaxed: '#8b5cf6', // Violet-500
    ma3: '#eab308',        // Yellow-500 (hoher Kontrast)
    pos: '#ef4444',        // Red-500 (hoher Kontrast)
    legacy: '#6b7280',     // Gray-500
}

const METHOD_LABELS: Record<string, string> = {
    rf: 'Random Forest (Standard)',
    rf_pos: 'Random Forest (Position)',
    rf_rank: 'Random Forest (Rank)',
    rf_relaxed: 'Random Forest (Relaxed)',
    ma3: 'Formdurchschnitt (MA3)',
    pos: 'Positionsmittel (POS)',
    legacy: 'Legacy',
}

export function TeamBacktestChart({
    data,
    title = '',
    height = '500px',
    showLegend = true
}: TeamBacktestChartProps) {
    const isDark = true

    const option: EChartsOption = useMemo(() => {
        // Gruppiere Daten nach Methode
        const methodsData: Record<string, Array<[number, number]>> = {}
        const methods = new Set<string>()
        const gameweeks = new Set<number>()

        data.forEach(row => {
            methods.add(row.method)
            gameweeks.add(row.gw)

            if (!methodsData[row.method]) {
                methodsData[row.method] = []
            }

            // Nur Punkte > 0 plotten (Selection failures ignorieren)
            if (row.xi_points > 0) {
                methodsData[row.method].push([row.gw, row.xi_points])
            }
        })

        const gwArray = Array.from(gameweeks).sort((a, b) => a - b)

        // Erstelle Series für jede Methode
        const series = Array.from(methods).map(method => ({
            name: METHOD_LABELS[method] || method,
            type: 'line' as const,
            data: methodsData[method].sort((a, b) => a[0] - b[0]),
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: {
                width: 3,
            },
            itemStyle: {
                color: METHOD_COLORS[method] || '#94a3b8',
            },
            emphasis: {
                focus: 'series' as const,
                blurScope: 'coordinateSystem' as const,
            },
        }))

        return {
            title: title ? {
                text: title,
                left: 'center',
                textStyle: {
                    fontSize: 18,
                    fontWeight: 600,
                    color: isDark ? '#f3f4f6' : '#1f2937',
                },
            } : undefined,
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    label: {
                        backgroundColor: '#6b7280',
                    },
                },
                backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark ? '#4b5563' : '#e5e7eb',
                borderWidth: 1,
                textStyle: {
                    color: isDark ? '#f3f4f6' : '#1f2937',
                },
                formatter: (params: any) => {
                    if (!params || params.length === 0) return ''

                    const gw = params[0].data[0]
                    let tooltip = `<div style="font-weight: 600; margin-bottom: 8px;">Spieltag ${gw}</div>`

                    params.forEach((param: any) => {
                        const points = param.data[1]
                        const color = param.color
                        tooltip += `
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <span style="display: inline-block; width: 10px; height: 10px; background: ${color}; border-radius: 50%;"></span>
                                <span style="flex: 1;">${param.seriesName}:</span>
                                <span style="font-weight: 600;">${points.toFixed(1)} Pkt</span>
                            </div>
                        `
                    })

                    return tooltip
                },
            },
            legend: showLegend ? {
                data: Array.from(methods).map(m => METHOD_LABELS[m] || m),
                top: title ? 40 : 10,
                right: 150, // Platz für "Tabelle anzeigen" Button
                type: 'scroll',
                textStyle: {
                    color: isDark ? '#d1d5db' : '#374151',
                },
            } : undefined,
            grid: {
                left: '3%',
                right: '4%',
                bottom: '12%',
                top: showLegend ? (title ? 80 : 50) : (title ? 60 : 30),
                containLabel: true,
            },
            xAxis: {
                type: 'value',
                name: 'Spieltag (GW)',
                nameLocation: 'middle',
                nameGap: 30,
                nameTextStyle: {
                    color: isDark ? '#9ca3af' : '#6b7280',
                    fontSize: 12,
                },
                min: Math.min(...gwArray),
                max: Math.max(...gwArray),
                axisLabel: {
                    formatter: (value: number) => `GW${value}`,
                    color: isDark ? '#9ca3af' : '#6b7280',
                    rotate: 45, // Labels schräg stellen um Überlappung zu vermeiden
                    fontSize: 10,
                },
                axisLine: {
                    lineStyle: {
                        color: isDark ? '#4b5563' : '#e5e7eb',
                    },
                },
                splitLine: {
                    lineStyle: {
                        color: isDark ? '#374151' : '#f3f4f6',
                    },
                },
            },
            yAxis: {
                type: 'value',
                name: 'Punkte des Teams',
                nameLocation: 'middle',
                nameGap: 50,
                nameTextStyle: {
                    color: isDark ? '#9ca3af' : '#6b7280',
                    fontSize: 12,
                },
                min: 0,
                axisLabel: {
                    formatter: '{value}',
                    color: isDark ? '#9ca3af' : '#6b7280',
                },
                axisLine: {
                    lineStyle: {
                        color: isDark ? '#4b5563' : '#e5e7eb',
                    },
                },
                splitLine: {
                    lineStyle: {
                        color: isDark ? '#374151' : '#f3f4f6',
                    },
                },
            },
            series,
            toolbox: {
                feature: {
                    dataZoom: {
                        yAxisIndex: 'none',
                        title: {
                            zoom: 'Bereich wählen',
                            back: 'Zurücksetzen',
                        },
                    },
                    magicType: {
                        type: ['line', 'bar'],
                        title: {
                            line: 'Liniendiagramm',
                            bar: 'Balkendiagramm',
                        },
                    },
                    restore: {
                        title: 'Zurücksetzen',
                    },
                    saveAsImage: {
                        title: 'Als Bild speichern',
                        pixelRatio: 2,
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    },
                },
                right: 20,
                top: 10,
                iconStyle: {
                    borderColor: isDark ? '#9ca3af' : '#6b7280',
                },
                emphasis: {
                    iconStyle: {
                        borderColor: isDark ? '#f3f4f6' : '#1f2937',
                    },
                },
            },
            dataZoom: [
                {
                    type: 'inside',
                    xAxisIndex: 0,
                },
                {
                    type: 'slider',
                    xAxisIndex: 0,
                    bottom: 10,
                    textStyle: {
                        color: isDark ? '#9ca3af' : '#6b7280',
                    },
                    borderColor: isDark ? '#4b5563' : '#e5e7eb',
                    fillerColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                    handleStyle: {
                        color: '#3b82f6',
                        borderColor: '#3b82f6',
                    },
                    dataBackground: {
                        lineStyle: {
                            color: isDark ? '#6b7280' : '#9ca3af',
                        },
                        areaStyle: {
                            color: isDark ? '#374151' : '#e5e7eb',
                        },
                    },
                },
            ],
        }
    }, [data, title, showLegend, isDark])

    return (
        <div className="w-full">
            <ReactECharts
                option={option}
                style={{ height, width: '100%' }}
                opts={{ renderer: 'svg' }}
            />
        </div>
    )
}
