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
    isCaptain?: boolean
    isVice?: boolean
    className?: string // Neu für individuelle Styles
}

// PlayerCard mit drei Modi: pitch (kompakt, 100x135), list (horizontal), bench (80x110 minimal)
export function PlayerCard({ player, mode = 'pitch', footer, showPosition = true, isCaptain = false, isVice = false, className = '' }: Props) {
    const priceStr = player.price != null ? `£${player.price.toFixed(1)}M` : '—'
    const ptsStr = player.predicted_points != null ? player.predicted_points.toFixed(1) : '—'
    const [broken, setBroken] = useState(false)
    const imgSrc = !broken && player.image ? player.image : '/images/player-placeholder.png'

    if (mode === 'bench') {
        // Bank Mode: minimalistisch - nur Foto + Name + Teamlogo
        return (
            <div className={`relative flex flex-col items-center rounded-lg bg-slate-800/90 border border-slate-600 shadow-[0_4px_12px_rgba(0,0,0,0.35)] text-slate-100 w-[90px] h-[115px] select-none transition-all duration-150 hover:shadow-lg hover:shadow-emerald-700/20 hover:-translate-y-[2px] active:scale-[0.97] active:shadow-none hover:border-emerald-500/50 ${className}`}>
                {/* Glossy Layer */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-10" />
                {isCaptain && (
                    <div className="absolute -top-2 -right-2 w-[26px] h-[26px] rounded-full bg-[#FDD835] text-slate-900 flex items-center justify-center text-[10px] font-bold shadow z-30">
                        C
                    </div>
                )}
                {isVice && (
                    <div className="absolute -top-2 -right-2 w-[26px] h-[26px] rounded-full bg-[#42A5F5] text-slate-900 flex items-center justify-center text-[10px] font-bold shadow z-30">
                        V
                    </div>
                )}
                <div className="w-[60px] h-[60px] rounded-full overflow-hidden mx-auto mt-2 mb-2">
                    <img
                        src={imgSrc}
                        alt={player.name}
                        className="w-full h-full object-cover object-top"
                        onError={() => setBroken(true)}
                    />
                </div>
                <div className="text-[10px] font-medium leading-tight w-full text-center truncate px-1.5">{player.name}</div>
                {player.clubImage && (
                    <img src={player.clubImage} alt={player.team || ''} className="absolute bottom-1.5 right-1.5 w-5 h-5 object-contain drop-shadow-[0_0_5px_rgba(0,0,0,0.4)]" />
                )}
            </div>
        )
    }

    if (mode === 'list') {
        // Horizontale Darstellung für Listen
        return (
            <div className={`relative flex items-center gap-3 p-2 rounded-lg bg-slate-800/80 border border-slate-600 shadow-[0_4px_12px_rgba(0,0,0,0.35)] text-slate-100 select-none transition-all duration-150 hover:shadow-lg hover:shadow-emerald-700/20 hover:-translate-y-[2px] active:scale-[0.97] active:shadow-none hover:border-emerald-500/50 ${className}`}>
                {/* Glossy Layer */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-10" />
                {isCaptain && (
                    <div className="absolute -top-2 -right-2 w-[26px] h-[26px] rounded-full bg-[#FDD835] text-slate-900 flex items-center justify-center text-[10px] font-bold shadow z-30">
                        C
                    </div>
                )}
                {isVice && (
                    <div className="absolute -top-2 -right-2 w-[26px] h-[26px] rounded-full bg-[#42A5F5] text-slate-900 flex items-center justify-center text-[10px] font-bold shadow z-30">
                        V
                    </div>
                )}
                <div className="w-[48px] h-[48px] rounded-full overflow-hidden flex-shrink-0">
                    <img
                        src={imgSrc}
                        alt={player.name}
                        className="w-full h-full object-cover object-top"
                        onError={() => setBroken(true)}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{player.name}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                        {showPosition && (
                            <span className="text-[10px] uppercase font-semibold bg-slate-700 rounded px-1.5 py-0.5">{player.position}</span>
                        )}
                        <span className="font-semibold text-emerald-400">{priceStr}</span>
                        <span className="font-medium text-blue-400">{ptsStr} Pts</span>
                    </div>
                </div>
                {player.clubImage && (
                    <img src={player.clubImage} alt={player.team || ''} className="w-5 h-5 object-contain drop-shadow-[0_0_5px_rgba(0,0,0,0.4)] flex-shrink-0" />
                )}
                {footer && <div className="ml-2">{footer}</div>}
            </div>
        )
    }

    // Pitch Mode: kompakte vertikale Karte
    return (
        <div className={`relative flex flex-col items-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 shadow-[0_4px_12px_rgba(0,0,0,0.35)] text-slate-100 w-[110px] h-[150px] py-2 px-2 select-none transition-all duration-150 hover:shadow-lg hover:shadow-emerald-700/20 hover:-translate-y-[2px] active:scale-[0.97] active:shadow-none hover:border-emerald-500/50 ${className}`}>
            {/* Glossy Layer */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-10" />
            {isCaptain && (
                <div className="absolute -top-2 -right-2 w-[26px] h-[26px] rounded-full bg-[#FDD835] text-slate-900 flex items-center justify-center text-[10px] font-bold shadow z-30">
                    C
                </div>
            )}
            {isVice && (
                <div className="absolute -top-2 -right-2 w-[26px] h-[26px] rounded-full bg-[#42A5F5] text-slate-900 flex items-center justify-center text-[10px] font-bold shadow z-30">
                    V
                </div>
            )}
            <div className="w-[75px] h-[75px] rounded-full overflow-hidden mb-2">
                <img
                    src={imgSrc}
                    alt={player.name}
                    className="w-full h-full object-cover object-top"
                    onError={() => setBroken(true)}
                />
            </div>
            <div className="text-[11.5px] font-medium tracking-tight leading-tight w-full text-center truncate px-1">{player.name}</div>
            {showPosition && (
                <div className="mt-1">
                    <span className="text-[10px] uppercase tracking-wide bg-slate-700 rounded px-1.5 py-0.5">{player.position}</span>
                </div>
            )}
            <div className="mt-auto w-full flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-medium text-emerald-400">{priceStr}</span>
                <span className="text-[10px] font-medium text-blue-400">{ptsStr} Pts</span>
            </div>
            // ...Logo-Rendering nur im jeweiligen Modus-Block...
            {footer && (
                <div className="mt-1 w-full">{footer}</div>
            )}
        </div>
    )
}

export default PlayerCard
