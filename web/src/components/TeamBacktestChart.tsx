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

// Farbschema für Methoden
const METHOD_COLORS: Record<string, string> = {
    rf: '#3b82f6',      // blue-500
    rf_rank: '#8b5cf6', // violet-500
    rf_pos: '#6366f1',  // indigo-500
    ma3: '#10b981',     // emerald-500
    pos: '#f59e0b',     // amber-500
    legacy: '#6b7280',  // gray-500
}

const METHOD_LABELS: Record<string, string> = {
    rf: 'Random Forest',
    rf_rank: 'RF (Rank)',
    rf_pos: 'RF (Pos)',
    ma3: 'MA3 (Form)',
    pos: 'Positionsmittel',
    legacy: 'Legacy',
}

export function TeamBacktestChart({ 
    data, 
    title = 'Team Backtest: Punkte pro Gameweek',
    height = '500px',
    showLegend = true 
}: TeamBacktestChartProps) {
    
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
            title: {
                text: title,
                left: 'center',
                textStyle: {
                    fontSize: 18,
                    fontWeight: 600,
                },
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    label: {
                        backgroundColor: '#6b7280',
                    },
                },
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                textStyle: {
                    color: '#1f2937',
                },
                formatter: (params: any) => {
                    if (!params || params.length === 0) return ''
                    
                    const gw = params[0].data[0]
                    let tooltip = `<div style="font-weight: 600; margin-bottom: 8px;">GW ${gw}</div>`
                    
                    params.forEach((param: any) => {
                        const points = param.data[1]
                        const color = param.color
                        tooltip += `
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <span style="display: inline-block; width: 10px; height: 10px; background: ${color}; border-radius: 50%;"></span>
                                <span style="flex: 1;">${param.seriesName}:</span>
                                <span style="font-weight: 600;">${points} Punkte</span>
                            </div>
                        `
                    })
                    
                    return tooltip
                },
            },
            legend: showLegend ? {
                data: Array.from(methods).map(m => METHOD_LABELS[m] || m),
                top: 40,
                type: 'scroll',
            } : undefined,
            grid: {
                left: '3%',
                right: '4%',
                bottom: '10%',
                top: showLegend ? 80 : 60,
                containLabel: true,
            },
            xAxis: {
                type: 'value',
                name: 'Gameweek',
                nameLocation: 'middle',
                nameGap: 30,
                min: Math.min(...gwArray),
                max: Math.max(...gwArray),
                interval: 1,
                axisLabel: {
                    formatter: (value: number) => `GW${value}`,
                },
            },
            yAxis: {
                type: 'value',
                name: 'Punkte',
                nameLocation: 'middle',
                nameGap: 50,
                min: 0,
                axisLabel: {
                    formatter: '{value}',
                },
            },
            series,
            toolbox: {
                feature: {
                    dataZoom: {
                        yAxisIndex: 'none',
                    },
                    restore: {},
                    saveAsImage: {
                        title: 'Als Bild speichern',
                        pixelRatio: 2,
                    },
                },
                right: 20,
                top: 10,
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
                },
            ],
        }
    }, [data, title, showLegend])
    
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
