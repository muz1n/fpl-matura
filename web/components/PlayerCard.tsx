import React, { useState } from 'react'

export type PlayerCardData = {
    name: string // nur der Name, keine doppelte Verkettung
    team: string | null
    position: string
    price: number | null
    predicted_points: number | null
    image: string | null // Wird als photoUrl interpretiert
    clubImage: string | null // Teamlogo
}

type Props = {
    player: PlayerCardData
    mode?: 'pitch' | 'list' | 'bench' // pitch: kompakt vertikal, list: breit horizontal, bench: minimalistisch klein
    footer?: React.ReactNode
    showPosition?: boolean // auf Pitch false
}

// PlayerCard mit drei Modi: pitch (kompakt, 100x135), list (horizontal), bench (80x110 minimal)
export function PlayerCard({ player, mode = 'pitch', footer, showPosition = true }: Props) {
    const priceStr = player.price != null ? `£${player.price.toFixed(1)}M` : '—'
    const ptsStr = player.predicted_points != null ? player.predicted_points.toFixed(1) : '—'
    const [broken, setBroken] = useState(false)
    const imgSrc = !broken && player.image ? player.image : '/images/player-placeholder.png'

    if (mode === 'bench') {
        // Bank Mode: minimalistisch 80x110 - nur Foto + Name
        return (
            <div className="relative flex flex-col items-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow text-slate-100 w-[80px] h-[110px] py-2 px-1.5 select-none">
                <div className="w-[50px] h-[50px] rounded-full overflow-hidden shadow ring-2 ring-slate-700 mb-1.5 bg-slate-900">
                    <img
                        src={imgSrc}
                        alt={player.name}
                        className="w-full h-full object-cover"
                        onError={() => setBroken(true)}
                    />
                </div>
                <div className="text-[10px] font-semibold leading-tight w-full text-center line-clamp-2 px-0.5">{player.name}</div>
                {footer && (
                    <div className="mt-1 w-full">{footer}</div>
                )}
            </div>
        )
    }

    if (mode === 'list') {
        // Horizontale Darstellung für Listen
        return (
            <div className="relative flex items-center gap-3 py-2 px-3 rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 shadow text-slate-100 min-w-[280px] select-none">
                <div className="w-12 h-12 rounded-full overflow-hidden shadow ring-2 ring-slate-700 bg-slate-900 flex-shrink-0">
                    <img
                        src={imgSrc}
                        alt={player.name}
                        className="w-full h-full object-cover"
                        onError={() => setBroken(true)}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{player.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                        {showPosition && (
                            <span className="text-[10px] uppercase tracking-wide bg-slate-700 rounded px-1.5 py-0.5">{player.position}</span>
                        )}
                        {player.team && <span className="text-xs text-slate-400 truncate">{player.team}</span>}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className="text-xs font-semibold text-emerald-400">{priceStr}</span>
                    <span className="text-xs font-medium text-blue-400">{ptsStr} Pts</span>
                </div>
                {player.clubImage && (
                    <img src={player.clubImage} alt={player.team || ''} className="w-6 h-6 object-contain opacity-80 flex-shrink-0" />
                )}
                {footer && <div className="ml-2">{footer}</div>}
            </div>
        )
    }

    // Pitch Mode: kompakte vertikale Karte
    return (
        <div className="relative flex flex-col items-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow text-slate-100 w-[100px] h-[135px] py-2 px-2 select-none">
            <div className="w-[70px] h-[70px] rounded-full overflow-hidden shadow ring-2 ring-slate-700 mb-1 bg-slate-900">
                <img
                    src={imgSrc}
                    alt={player.name}
                    className="w-full h-full object-cover"
                    onError={() => setBroken(true)}
                />
            </div>
            <div className="text-[11px] font-semibold leading-tight w-full text-center truncate px-1">{player.name}</div>
            {showPosition && (
                <div className="mt-1">
                    <span className="text-[10px] uppercase tracking-wide bg-slate-700 rounded px-1 py-0.5">{player.position}</span>
                </div>
            )}
            <div className="mt-1 w-full flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-medium text-emerald-400">{priceStr}</span>
                <span className="text-[10px] font-medium text-blue-400">{ptsStr} Pts</span>
            </div>
            {player.clubImage && (
                <img src={player.clubImage} alt={player.team || ''} className="absolute bottom-1 right-1 w-5 h-5 object-contain drop-shadow" />
            )}
            {footer && (
                <div className="mt-1 w-full">{footer}</div>
            )}
        </div>
    )
}

export default PlayerCard
