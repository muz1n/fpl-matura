import React, { useState } from 'react'

/**
 * Erstellt einen SVG Placeholder mit Initialen
 */
function getPlayerInitialsSvg(name: string): string {
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
        .replace(/[^A-Z]/g, '') // Entferne Nicht-ASCII Zeichen

    // Eindeutige ID für Gradient (basierend auf Name)
    const gradId = `grad-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250">
        <defs>
            <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:rgb(236,72,153);stop-opacity:1" />
                <stop offset="100%" style="stop-color:rgb(168,85,247);stop-opacity:1" />
            </linearGradient>
        </defs>
        <rect width="250" height="250" fill="url(#${gradId})"/>
        <text x="125" y="135" dominant-baseline="middle" text-anchor="middle" fill="white" 
              font-family="system-ui, -apple-system, sans-serif" font-size="90" font-weight="700">
            ${initials || '??'}
        </text>
    </svg>`

    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

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
    onRemove?: () => void // NEU: Callback zum Entfernen des Spielers
}

// PlayerCard mit drei Modi: pitch (kompakt, 100x135), list (horizontal), bench (80x110 minimal)
export function PlayerCard({ player, mode = 'pitch', footer, showPosition = true, isCaptain = false, isVice = false, className = '', onRemove }: Props) {
    const priceStr = player.price != null ? `£${player.price.toFixed(1)}M` : '—'
    const ptsStr = player.predicted_points != null ? player.predicted_points.toFixed(1) : '—'
    const [imgError, setImgError] = useState(false)

    // Versuche echtes Bild, fallback zu SVG bei Fehler
    const imgSrc = (!imgError && player.image)
        ? player.image
        : getPlayerInitialsSvg(player.name)
    const clubImgSrc = player.clubImage || null

    if (mode === 'bench') {
        // Bank Mode: GRÖSSER und schöner
        return (
            <div className={`relative flex flex-col items-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-pink-500/40 shadow-2xl text-slate-100 w-[160px] h-[200px] select-none transition-all duration-200 hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] hover:-translate-y-1 hover:scale-105 hover:border-pink-500/70 ${className}`}>
                {/* Glossy Layer */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-10" />

                {/* X-Button zum Entfernen (nur wenn onRemove vorhanden) */}
                {onRemove && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onRemove()
                        }}
                        className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-sm font-bold shadow-xl z-30 border-2 border-white transition-all hover:scale-110"
                    >
                        ×
                    </button>
                )}

                {isCaptain && (
                    <div className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-[#FDD835] text-slate-900 flex items-center justify-center text-sm font-bold shadow-xl z-30 border-2 border-white ring-2 ring-pink-500/50">
                        C
                    </div>
                )}
                {isVice && (
                    <div className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-[#42A5F5] text-white flex items-center justify-center text-sm font-bold shadow-xl z-30 border-2 border-white ring-2 ring-blue-500/50">
                        V
                    </div>
                )}
                <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mt-4 mb-3 border-2 border-pink-500/50 shadow-xl">
                    <img
                        src={imgSrc}
                        alt={player.name}
                        className="w-full h-full object-cover object-top"
                        onError={() => setImgError(true)}
                        crossOrigin="anonymous"
                    />
                </div>
                {/* FIX: line-clamp braucht block display, kein flex */}
                <div className="text-sm font-bold leading-tight w-full text-center px-2 line-clamp-2 break-words mb-2 min-h-[32px]">{player.name}</div>
                <div className="flex items-center gap-2 text-sm mb-2">
                    <span className="font-bold text-pink-400">{priceStr}</span>
                    <span className="text-blue-400 font-bold">{ptsStr} Pts</span>
                </div>
                {clubImgSrc && (
                    <img src={`/api/proxy-image?url=${encodeURIComponent(clubImgSrc)}`} alt={player.team || ''} className="absolute bottom-2 right-2 w-8 h-8 object-contain drop-shadow-xl opacity-90" />
                )}
            </div>
        )
    }

    if (mode === 'list') {
        // Horizontale Darstellung für Listen - NOCH GRÖSSER mit besserem Layout
        return (
            <div className={`relative flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 border-2 border-pink-500/30 shadow-xl text-slate-100 select-none transition-all duration-200 hover:shadow-2xl hover:shadow-pink-500/30 hover:-translate-y-1 hover:scale-[1.02] hover:border-pink-500/60 ${className}`}>
                {/* Glossy Layer */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-10" />
                {isCaptain && (
                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#FDD835] text-slate-900 flex items-center justify-center text-xs font-bold shadow-lg z-30 border-2 border-white">
                        C
                    </div>
                )}
                {isVice && (
                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#42A5F5] text-white flex items-center justify-center text-xs font-bold shadow-lg z-30 border-2 border-white">
                        V
                    </div>
                )}
                {/* Grösseres Avatar */}
                <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-pink-500/40 shadow-lg">
                    <img
                        src={imgSrc}
                        alt={player.name}
                        className="w-full h-full object-cover object-top"
                        onError={() => setImgError(true)}
                        crossOrigin="anonymous"
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold truncate text-white mb-1">{player.name}</div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {showPosition && (
                            <span className="text-xs uppercase font-bold bg-pink-600/30 text-pink-300 rounded-lg px-2.5 py-1 border border-pink-500/40">{player.position}</span>
                        )}
                        <span className="font-bold text-pink-400 text-base">{priceStr}</span>
                        <span className="font-bold text-blue-400 text-base">{ptsStr} Pts</span>
                    </div>
                </div>
                {/* Grösseres Clublogo */}
                {clubImgSrc && (
                    <img src={`/api/proxy-image?url=${encodeURIComponent(clubImgSrc)}`} alt={player.team || ''} className="w-12 h-12 object-contain drop-shadow-lg flex-shrink-0" />
                )}
                {footer && <div className="ml-2">{footer}</div>}
            </div>
        )
    }

    // Pitch Mode: GRÖSSERE vertikale Karte mit mehr Platz für alle Infos
    // Höhe dynamisch: +30px wenn Footer vorhanden
    const pitchHeight = footer ? 'min-h-[250px]' : 'h-[220px]'
    return (
        <div className={`relative flex flex-col items-center rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-2 border-pink-500/50 shadow-2xl text-slate-100 w-[150px] ${pitchHeight} py-3 px-2.5 select-none transition-all duration-200 hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] hover:-translate-y-1 hover:scale-105 hover:border-pink-500/80 ${className}`}>
            {/* Glossy Layer */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-10" />

            {/* X-Button zum Entfernen (nur wenn onRemove vorhanden) */}
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                    }}
                    className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-sm font-bold shadow-xl z-30 border-2 border-white transition-all hover:scale-110"
                >
                    ×
                </button>
            )}

            {isCaptain && (
                <div className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-[#FDD835] text-slate-900 flex items-center justify-center text-sm font-bold shadow-xl z-30 border-2 border-white ring-2 ring-pink-500/50">
                    C
                </div>
            )}
            {isVice && (
                <div className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-[#42A5F5] text-white flex items-center justify-center text-sm font-bold shadow-xl z-30 border-2 border-white ring-2 ring-blue-500/50">
                    V
                </div>
            )}
            {/* RUNDER Avatar! */}
            <div className="w-24 h-24 rounded-full overflow-hidden mb-2 border-2 border-pink-500/50 shadow-xl relative shrink-0">
                <img
                    src={imgSrc}
                    alt={player.name}
                    className="w-full h-full object-cover object-top"
                    onError={() => setImgError(true)}
                    crossOrigin="anonymous"
                />
            </div>
            {/* FIX: line-clamp braucht block display, kein flex */}
            <div className="text-sm font-bold tracking-tight leading-tight w-full text-center px-1 line-clamp-2 break-words mb-1 min-h-[32px]">{player.name}</div>
            {/* Team Name - NEU */}
            {player.team && (
                <div className="text-xs text-slate-400 font-medium mb-1 truncate w-full text-center px-1">
                    {player.team}
                </div>
            )}
            {showPosition && (
                <div className="mb-1">
                    <span className="text-xs uppercase font-bold bg-pink-600/40 text-pink-200 rounded-lg px-2.5 py-1 border border-pink-500/50 shadow-lg">{player.position}</span>
                </div>
            )}
            <div className="mt-auto w-full flex flex-col items-center gap-1 pb-1">
                <span className="text-sm font-bold text-pink-400">{priceStr}</span>
                <span className="text-xs font-bold text-blue-400">{ptsStr} Pts</span>
            </div>
            {/* Club-Logo unten rechts */}
            {clubImgSrc && (
                <img
                    src={`/api/proxy-image?url=${encodeURIComponent(clubImgSrc)}`}
                    alt={player.team || ''}
                    className="absolute bottom-2 right-2 w-8 h-8 object-contain drop-shadow-xl z-20 opacity-90"
                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                />
            )}
            {footer && (
                <div className="mt-1 w-full">{footer}</div>
            )}
        </div>
    )
}

export default PlayerCard
