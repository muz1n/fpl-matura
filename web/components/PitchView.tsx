import { useMemo } from 'react'

type Player = {
    name: string
    position: string
    team: string | null
    price: number | null
    image: string | null
    clubImage: string | null
}

type PitchProps = {
    squad: Player[]
    formation: string
    onRemove?: (idx: number) => void
}

const FORMATIONS: Record<string, { def: number; mid: number; fwd: number }> = {
    '4-4-2': { def: 4, mid: 4, fwd: 2 },
    '4-3-3': { def: 4, mid: 3, fwd: 3 },
    '3-5-2': { def: 3, mid: 5, fwd: 2 },
    '3-4-3': { def: 3, mid: 4, fwd: 3 },
    '5-4-1': { def: 5, mid: 4, fwd: 1 },
    '5-3-2': { def: 5, mid: 3, fwd: 2 },
    '4-5-1': { def: 4, mid: 5, fwd: 1 },
}

export function PitchView({ squad, formation, onRemove }: PitchProps) {
    const formConfig = FORMATIONS[formation] || FORMATIONS['4-4-2']

    const lineup = useMemo(() => {
        const gk = squad.filter(p => p.position === 'GK').slice(0, 1)
        const def = squad.filter(p => p.position === 'DEF').slice(0, formConfig.def)
        const mid = squad.filter(p => p.position === 'MID').slice(0, formConfig.mid)
        const fwd = squad.filter(p => p.position === 'FWD').slice(0, formConfig.fwd)
        return { gk, def, mid, fwd }
    }, [squad, formConfig])

    const totalOnPitch = lineup.gk.length + lineup.def.length + lineup.mid.length + lineup.fwd.length

    return (
        <div className="relative w-full h-full bg-gradient-to-b from-emerald-600 to-emerald-700 rounded-lg overflow-hidden">
            {/* Pitch lines */}
            <div className="absolute inset-0 opacity-20">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeWidth="0.3" />
                    <circle cx="50" cy="50" r="10" fill="none" stroke="white" strokeWidth="0.3" />
                    <rect x="0" y="35" width="15" height="30" fill="none" stroke="white" strokeWidth="0.3" />
                    <rect x="85" y="35" width="15" height="30" fill="none" stroke="white" strokeWidth="0.3" />
                </svg>
            </div>

            {totalOnPitch === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white/60">
                        <svg className="w-16 h-16 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <p className="font-semibold text-lg">Leere Aufstellung</p>
                        <p className="text-sm mt-1">Formation: {formation}</p>
                    </div>
                </div>
            ) : (
                <div className="relative w-full h-full p-4 flex flex-col justify-between">
                    {/* GK */}
                    <div className="flex justify-center gap-2">
                        {lineup.gk.map((p, i) => (
                            <PlayerCard key={`gk-${i}`} player={p} idx={squad.indexOf(p)} onRemove={onRemove} />
                        ))}
                        {lineup.gk.length === 0 && <EmptySlot label="GK" />}
                    </div>

                    {/* DEF */}
                    <div className="flex justify-center gap-2">
                        {lineup.def.map((p, i) => (
                            <PlayerCard key={`def-${i}`} player={p} idx={squad.indexOf(p)} onRemove={onRemove} />
                        ))}
                        {Array.from({ length: formConfig.def - lineup.def.length }).map((_, i) => (
                            <EmptySlot key={`def-empty-${i}`} label="DEF" />
                        ))}
                    </div>

                    {/* MID */}
                    <div className="flex justify-center gap-2">
                        {lineup.mid.map((p, i) => (
                            <PlayerCard key={`mid-${i}`} player={p} idx={squad.indexOf(p)} onRemove={onRemove} />
                        ))}
                        {Array.from({ length: formConfig.mid - lineup.mid.length }).map((_, i) => (
                            <EmptySlot key={`mid-empty-${i}`} label="MID" />
                        ))}
                    </div>

                    {/* FWD */}
                    <div className="flex justify-center gap-2">
                        {lineup.fwd.map((p, i) => (
                            <PlayerCard key={`fwd-${i}`} player={p} idx={squad.indexOf(p)} onRemove={onRemove} />
                        ))}
                        {Array.from({ length: formConfig.fwd - lineup.fwd.length }).map((_, i) => (
                            <EmptySlot key={`fwd-empty-${i}`} label="FWD" />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function PlayerCard({ player, idx, onRemove }: { player: Player; idx: number; onRemove?: (idx: number) => void }) {
    return (
        <div className="group relative">
            <div className="bg-white rounded-lg shadow-lg p-2 w-20 text-center hover:scale-105 transition-transform">
                <img
                    src={player.image || ''}
                    alt={player.name}
                    className="w-14 h-14 rounded-full mx-auto mb-1 object-cover border-2 border-emerald-200"
                />
                <div className="text-xs font-semibold text-slate-900 truncate">{player.name.split(' ').pop()}</div>
                <div className="text-xs text-slate-600">£{player.price?.toFixed(1)}</div>
            </div>
            {onRemove && (
                <button
                    className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    onClick={() => onRemove(idx)}
                >
                    ×
                </button>
            )}
        </div>
    )
}

function EmptySlot({ label }: { label: string }) {
    return (
        <div className="bg-white/10 border-2 border-dashed border-white/40 rounded-lg w-20 h-24 flex items-center justify-center">
            <span className="text-white/60 text-xs font-medium">{label}</span>
        </div>
    )
}

export const FORMATION_OPTIONS = Object.keys(FORMATIONS)
