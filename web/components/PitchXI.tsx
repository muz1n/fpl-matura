import React, { useCallback, useState } from "react";
import { DndContext, useSensor, useSensors, PointerSensor, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import PlayerCard, { PlayerCardData } from '@/components/PlayerCard'

// Formation Strings gemäss Vorgabe
export type FormationStr =
    | "3-4-3"
    | "3-5-2"
    | "4-4-2"
    | "4-3-3"
    | "4-5-1"
    | "5-3-2"
    | "5-4-1";

export type PitchPosition = "GK" | "DEF" | "MID" | "FWD";

// Datentyp für Spieler auf dem Pitch
export interface PitchPlayer {
    id: number;
    name: string;
    position: PitchPosition;
    teamShort: string;
    price: number; // in Mio
    predictedPoints?: number;
    photoUrl?: string;
    clubImage?: string;
    isCaptain?: boolean;
    isVice?: boolean;
}

interface PitchXIProps {
    formation: FormationStr;
    players: PitchPlayer[]; // XI Spieler
    bench?: PitchPlayer[]; // Bankspieler
    captainId?: number;
    viceCaptainId?: number;
    onChange?: (xi: PitchPlayer[], bench: PitchPlayer[]) => void; // Drag & Drop Update
    onCaptainChange?: (captainId: number, viceCaptainId: number) => void;
}

/**
 * Kleine FIFA-artige Spielerkarte für den Pitch.
 * Kompakt, damit 11 Karten sauber Platz haben.
 */
// Reine Pitch-spezifische Wrapper-Karte: nutzt globale PlayerCard ohne Positionsanzeige
const PitchPlayerCard: React.FC<{ player: PitchPlayer }> = ({ player }) => {
    const data: PlayerCardData = {
        name: player.name,
        team: player.teamShort,
        position: player.position,
        price: player.price,
        predicted_points: typeof player.predictedPoints === 'number' ? player.predictedPoints : null,
        image: player.photoUrl || null,
        clubImage: player.clubImage || null
    }
    return <PlayerCard player={data} compact showPosition={false} />
}

/**
 * Gruppiert Spieler nach Position gemäss Formation.
 */
function groupPlayersByFormation(formation: FormationStr, players: PitchPlayer[]) {
    const [defCount, midCount, fwdCount] = formation
        .split("-")
        .map((p) => parseInt(p, 10));

    const gks = players.filter((p) => p.position === "GK").slice(0, 1);
    const defs = players.filter((p) => p.position === "DEF").slice(0, defCount);
    const mids = players.filter((p) => p.position === "MID").slice(0, midCount);
    const fwds = players.filter((p) => p.position === "FWD").slice(0, fwdCount);

    return { gks, defs, mids, fwds };
}

/**
 * Pitch Darstellung: Vier horizontale Reihen (FWD – MID – DEF – GK)
 */
export const PitchXI: React.FC<PitchXIProps> = ({ formation, players, bench = [], onChange, captainId = -1, viceCaptainId = -1, onCaptainChange }) => {
    // Lokale Zustände für XI und Bench
    const [xiLocal, setXiLocal] = useState<PitchPlayer[]>(players)
    const [benchLocal, setBenchLocal] = useState<PitchPlayer[]>(bench)

    React.useEffect(() => setXiLocal(players), [players])
    React.useEffect(() => setBenchLocal(bench), [bench])

    const sensors = useSensors(useSensor(PointerSensor))

    // Formation Limits
    const [defCount, midCount, fwdCount] = formation.split('-').map(n => parseInt(n, 10))

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event
        if (!over) return
        const overId = String(over.id)
        // Identifiziere Quelle (XI oder Bench)
        const inXI = xiLocal.some(p => p.id === active.id)
        const inBench = benchLocal.some(p => p.id === active.id)
        const rowToPosMap: Record<string, PitchPosition> = {
            row_gk: 'GK',
            row_def: 'DEF',
            row_mid: 'MID',
            row_fwd: 'FWD'
        }
        if (overId === 'row_bench') {
            // Move nach Bench
            if (inXI) {
                setXiLocal(prev => {
                    const moved = prev.find(p => p.id === active.id)
                    const remaining = prev.filter(p => p.id !== active.id)
                    if (!moved) return prev
                    setBenchLocal(b => [...b, moved])
                    const newXI = remaining
                    if (onChange) onChange(newXI, [...benchLocal, moved])
                    return newXI
                })
            }
            return
        }
        const newPos = rowToPosMap[overId]
        if (!newPos) return
        // Move von Bench ins XI
        if (inBench) {
            const moved = benchLocal.find(p => p.id === active.id)
            if (!moved) return
            // Check Limit für Zielposition
            const xiCounts = {
                GK: xiLocal.filter(p => p.position === 'GK').length,
                DEF: xiLocal.filter(p => p.position === 'DEF').length,
                MID: xiLocal.filter(p => p.position === 'MID').length,
                FWD: xiLocal.filter(p => p.position === 'FWD').length,
            }
            const limitOk = (newPos === 'GK' ? xiCounts.GK < 1 :
                newPos === 'DEF' ? xiCounts.DEF < defCount :
                    newPos === 'MID' ? xiCounts.MID < midCount :
                        xiCounts.FWD < fwdCount)
            if (!limitOk) return
            setBenchLocal(prevBench => prevBench.filter(p => p.id !== active.id))
            setXiLocal(prevXI => {
                const newXI = [...prevXI, { ...moved!, position: newPos }]
                if (onChange) onChange(newXI, benchLocal.filter(p => p.id !== active.id))
                return newXI
            })
            return
        }
        // Wechsel innerhalb XI zu anderer Position (wenn Limit nicht verletzt)
        setXiLocal(prev => {
            const xiCounts = {
                GK: prev.filter(p => p.position === 'GK').length,
                DEF: prev.filter(p => p.position === 'DEF').length,
                MID: prev.filter(p => p.position === 'MID').length,
                FWD: prev.filter(p => p.position === 'FWD').length,
            }
            const changed = prev.find(p => p.id === active.id)
            if (!changed) return prev
            if (changed.position === newPos) return prev
            // Beim Wechsel zuerst Zähler für neue Position prüfen
            const limitOk = (newPos === 'GK' ? xiCounts.GK < 1 :
                newPos === 'DEF' ? xiCounts.DEF < defCount :
                    newPos === 'MID' ? xiCounts.MID < midCount :
                        xiCounts.FWD < fwdCount)
            if (!limitOk) return prev
            const updated = prev.map(p => p.id === active.id ? { ...p, position: newPos } : p)
            if (onChange) onChange(updated, benchLocal)
            return updated
        })
    }, [benchLocal, xiLocal, onChange, defCount, midCount, fwdCount])

    const { gks, defs, mids, fwds } = groupPlayersByFormation(formation, xiLocal)
    const empty = xiLocal.length === 0

    // Droppable Zonen (jede einzeln, keine Schleifen wegen Hook-Regeln)
    const fwdDrop = useDroppable({ id: 'row_fwd' })
    const midDrop = useDroppable({ id: 'row_mid' })
    const defDrop = useDroppable({ id: 'row_def' })
    const gkDrop = useDroppable({ id: 'row_gk' })
    const benchDrop = useDroppable({ id: 'row_bench' })

    // Draggable Wrapper
    function DraggablePlayer({ p, children }: { p: PitchPlayer; children: React.ReactNode }) {
        const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: p.id })
        const style: React.CSSProperties = transform ? { transform: CSS.Translate.toString(transform) } : {}
        return <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative cursor-grab">{children}</div>
    }

    return (
        <div className="w-full max-w-3xl mx-auto">
            <div className="mb-2 flex items-center justify-between text-xs text-emerald-100/80">
                <span className="font-semibold text-emerald-300">{formation}</span>
                <span className="font-semibold text-emerald-300">{xiLocal.length}/11</span>
            </div>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-emerald-500/70 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 shadow-xl">
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/40" />
                        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-emerald-300/30" />
                        <div className="absolute left-1/2 top-4 h-16 w-40 -translate-x-1/2 border border-emerald-300/25" />
                        <div className="absolute bottom-4 left-1/2 h-16 w-40 -translate-x-1/2 border border-emerald-300/25" />
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(16,94,60,0.35)_0,rgba(16,94,60,0.35)_8px,rgba(5,46,22,0.35)_8px,rgba(5,46,22,0.35)_16px)] opacity-60" />
                    </div>
                    {empty && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex flex-col items-center text-slate-300">
                                <div className="w-16 h-16 rounded-full bg-slate-700/40 flex items-center justify-center mb-3">
                                    <span className="text-xs font-semibold">XI</span>
                                </div>
                                <span className="text-sm">Noch keine Spieler hinzugefügt</span>
                            </div>
                        </div>
                    )}
                    {!empty && (
                        <div className="relative z-10 flex h-full flex-col justify-between px-4 py-6">
                            <div ref={fwdDrop.setNodeRef} id="row_fwd" className="flex flex-1 items-start justify-center gap-4">
                                {fwds.map((p) => (
                                    <DraggablePlayer key={p.id} p={p}>
                                        <div
                                            onDoubleClick={() => {
                                                if (!onCaptainChange) return
                                                if (captainId === p.id) {
                                                    onCaptainChange(-1, p.id)
                                                } else if (viceCaptainId === p.id) {
                                                    onCaptainChange(p.id, -1)
                                                } else if (captainId === -1) {
                                                    onCaptainChange(p.id, viceCaptainId)
                                                } else if (viceCaptainId === -1) {
                                                    onCaptainChange(captainId, p.id)
                                                } else {
                                                    onCaptainChange(p.id, viceCaptainId)
                                                }
                                            }}
                                        >
                                            <PitchPlayerCard player={p} />
                                            {captainId === p.id && <span className="absolute -top-2 -right-2 bg-amber-400 text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full text-slate-900 shadow">C</span>}
                                            {viceCaptainId === p.id && captainId !== p.id && <span className="absolute -top-2 -right-2 bg-blue-400 text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full text-slate-900 shadow">VC</span>}
                                        </div>
                                    </DraggablePlayer>
                                ))}
                            </div>
                            <div ref={midDrop.setNodeRef} id="row_mid" className="flex flex-1 items-center justify-center gap-4">
                                {mids.map((p) => (
                                    <DraggablePlayer key={p.id} p={p}>
                                        <div
                                            onDoubleClick={() => {
                                                if (!onCaptainChange) return
                                                if (captainId === p.id) {
                                                    onCaptainChange(-1, p.id)
                                                } else if (viceCaptainId === p.id) {
                                                    onCaptainChange(p.id, -1)
                                                } else if (captainId === -1) {
                                                    onCaptainChange(p.id, viceCaptainId)
                                                } else if (viceCaptainId === -1) {
                                                    onCaptainChange(captainId, p.id)
                                                } else {
                                                    onCaptainChange(p.id, viceCaptainId)
                                                }
                                            }}
                                        >
                                            <PitchPlayerCard player={p} />
                                            {captainId === p.id && <span className="absolute -top-2 -right-2 bg-amber-400 text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full text-slate-900 shadow">C</span>}
                                            {viceCaptainId === p.id && captainId !== p.id && <span className="absolute -top-2 -right-2 bg-blue-400 text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full text-slate-900 shadow">VC</span>}
                                        </div>
                                    </DraggablePlayer>
                                ))}
                            </div>
                            <div ref={defDrop.setNodeRef} id="row_def" className="flex flex-1 items-center justify-center gap-4">
                                {defs.map((p) => (
                                    <DraggablePlayer key={p.id} p={p}>
                                        <div
                                            onDoubleClick={() => {
                                                if (!onCaptainChange) return
                                                if (captainId === p.id) {
                                                    onCaptainChange(-1, p.id)
                                                } else if (viceCaptainId === p.id) {
                                                    onCaptainChange(p.id, -1)
                                                } else if (captainId === -1) {
                                                    onCaptainChange(p.id, viceCaptainId)
                                                } else if (viceCaptainId === -1) {
                                                    onCaptainChange(captainId, p.id)
                                                } else {
                                                    onCaptainChange(p.id, viceCaptainId)
                                                }
                                            }}
                                        >
                                            <PitchPlayerCard player={p} />
                                            {captainId === p.id && <span className="absolute -top-2 -right-2 bg-amber-400 text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full text-slate-900 shadow">C</span>}
                                            {viceCaptainId === p.id && captainId !== p.id && <span className="absolute -top-2 -right-2 bg-blue-400 text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full text-slate-900 shadow">VC</span>}
                                        </div>
                                    </DraggablePlayer>
                                ))}
                            </div>
                            <div ref={gkDrop.setNodeRef} id="row_gk" className="flex flex-1 items-end justify-center gap-4">
                                {gks.map((p) => (
                                    <DraggablePlayer key={p.id} p={p}>
                                        <div
                                            onDoubleClick={() => {
                                                if (!onCaptainChange) return
                                                if (captainId === p.id) {
                                                    onCaptainChange(-1, p.id)
                                                } else if (viceCaptainId === p.id) {
                                                    onCaptainChange(p.id, -1)
                                                } else if (captainId === -1) {
                                                    onCaptainChange(p.id, viceCaptainId)
                                                } else if (viceCaptainId === -1) {
                                                    onCaptainChange(captainId, p.id)
                                                } else {
                                                    onCaptainChange(p.id, viceCaptainId)
                                                }
                                            }}
                                        >
                                            <PitchPlayerCard player={p} />
                                            {captainId === p.id && <span className="absolute -top-2 -right-2 bg-amber-400 text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full text-slate-900 shadow">C</span>}
                                            {viceCaptainId === p.id && captainId !== p.id && <span className="absolute -top-2 -right-2 bg-blue-400 text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full text-slate-900 shadow">VC</span>}
                                        </div>
                                    </DraggablePlayer>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DndContext>
            {/* Bench */}
            <div ref={benchDrop.setNodeRef} id="row_bench" className="mt-4 flex justify-center gap-3 flex-wrap">
                {benchLocal.map(b => (
                    <DraggablePlayer key={b.id} p={b}>
                        <PitchPlayerCard player={b} />
                    </DraggablePlayer>
                ))}
                {benchLocal.length === 0 && <div className="text-xs text-slate-400">Bench leer</div>}
            </div>
        </div>
    );
};

export default PitchXI;
