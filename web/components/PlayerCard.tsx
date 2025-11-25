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
    compact?: boolean
    footer?: React.ReactNode
    showPosition?: boolean // auf Pitch false
}

// Minimal dark theme card ~100x130 px
export function PlayerCard({ player, compact, footer, showPosition = true }: Props) {
    // Feste Kartenabmessungen gemäss Vorgabe
    const priceStr = player.price != null ? `£${player.price.toFixed(1)}M` : '—'
    const ptsStr = player.predicted_points != null ? player.predicted_points.toFixed(1) : '—'
    const [broken, setBroken] = useState(false)

    // Fallback auf statisches Platzhalterbild im public Folder
    const imgSrc = !broken && player.image ? player.image : '/images/player-placeholder.png'

    return (
        <div className={`relative flex flex-col items-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow text-slate-100 w-[100px] h-[135px] ${compact ? 'py-1.5 px-1' : 'py-2 px-2'} select-none`}>
            {/* Foto immer 70x70 */}
            <div className="w-[70px] h-[70px] rounded-full overflow-hidden shadow ring-2 ring-slate-700 mb-1 bg-slate-900">
                <img
                    src={imgSrc}
                    alt={player.name}
                    className="w-full h-full object-cover"
                    onError={() => setBroken(true)}
                />
            </div>
            {/* Name */}
            <div className="text-[11px] font-semibold leading-tight w-full text-center truncate px-1">{player.name}</div>
            {/* Position optional */}
            {showPosition && (
                <div className="mt-1">
                    <span className="text-[10px] uppercase tracking-wide bg-slate-700 rounded px-1 py-0.5">{player.position}</span>
                </div>
            )}
            {/* Preis & Punkte */}
            <div className="mt-1 w-full flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-medium text-emerald-400">{priceStr}</span>
                <span className="text-[10px] font-medium text-blue-400">{ptsStr} Pts</span>
            </div>
            {/* Teamlogo unten rechts immer sichtbar */}
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
