import React, { useCallback, useEffect, useState } from "react";
import { DndContext, useSensor, useSensors, PointerSensor, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import PlayerCard, { PlayerCardData } from '@/components/PlayerCard'
import styles from './settle-animation.module.css'

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
 * Hilfsfunktion: PitchPlayer zu PlayerCardData konvertieren
 */
function toPlayerCardData(player: PitchPlayer): PlayerCardData {
    return {
        name: player.name,
        team: player.teamShort,
        position: player.position,
        price: player.price,
        predicted_points: typeof player.predictedPoints === 'number' ? player.predictedPoints : null,
        image: player.photoUrl || null,
        clubImage: player.clubImage || null
    }
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
        const { attributes, listeners, setNodeRef, transform, isDragging, active } = useDraggable({ id: p.id })
        const [settle, setSettle] = useState(false)
        useEffect(() => {
            if (!isDragging && active) {
                setSettle(true)
                const t = setTimeout(() => setSettle(false), 120)
                return () => clearTimeout(t)
            }
        }, [isDragging, active])
        const style: React.CSSProperties = {
            transform: transform ? CSS.Translate.toString(transform) : undefined,
            willChange: 'transform',
            transition: isDragging ? 'transform 75ms' : 'transform 200ms ease-out',
        }
        return (
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className={`cursor-grab shrink-0 ${isDragging ? 'z-20 scale-[1.03] shadow-2xl shadow-emerald-700/30 opacity-95' : 'z-10'} transition-transform duration-75 ${settle ? styles.settleAnimation : ''}`}
            >
                {children}
            </div>
        )
    }

    return (
        <div className="w-full">
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="aspect-[3/4] w-full rounded-3xl border border-emerald-600/60 relative bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 p-3 shadow-inner shadow-black/20">
                    {/* Turf-Textur Layer */}
                    <div className="absolute inset-0 pointer-events-none rounded-3xl bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0,rgba(0,0,0,0)_70%)]" />
                    {/* Faint horizontal stripes */}
                    <div className="absolute inset-0 pointer-events-none rounded-3xl bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.14)_0,rgba(0,0,0,0.14)_4px,rgba(255,255,255,0.05)_4px,rgba(255,255,255,0.05)_8px)]" />
                    {/* Pitch Lines Layer */}
                    <div className="pointer-events-none absolute inset-3 overflow-hidden rounded-2xl">
                        {/* Mittelkreis */}
                        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent border-[1.5px] border-emerald-200/40" style={{ filter: 'drop-shadow(0 0 3px rgba(80,200,120,0.3))' }} />
                        {/* Mittellinie */}
                        <div className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 bg-emerald-200/40" style={{ filter: 'drop-shadow(0 0 3px rgba(80,200,120,0.3))' }} />
                        {/* Strafraum oben */}
                        <div className="absolute left-1/2 top-4 h-16 w-40 -translate-x-1/2 bg-transparent border-[1.5px] border-emerald-200/40" style={{ filter: 'drop-shadow(0 0 3px rgba(80,200,120,0.3))' }} />
                        {/* Strafraum unten */}
                        <div className="absolute bottom-4 left-1/2 h-16 w-40 -translate-x-1/2 bg-transparent border-[1.5px] border-emerald-200/40" style={{ filter: 'drop-shadow(0 0 3px rgba(80,200,120,0.3))' }} />
                    </div>

                    {/* Empty State */}
                    {empty && (
                        <div className="absolute inset-3 flex items-center justify-center">
                            <div className="flex flex-col items-center text-emerald-300/60">
                                <div className="w-16 h-16 rounded-full bg-emerald-800/40 flex items-center justify-center mb-3">
                                    <span className="text-xs font-semibold">XI</span>
                                </div>
                                <span className="text-sm">Noch keine Spieler hinzugefügt</span>
                            </div>
                        </div>
                    )}

                    {/* Players in Flex Rows */}
                    {!empty && (
                        <div className="relative z-10 flex h-full flex-col justify-between py-2">
                            {/* FWD Row */}
                            <div ref={fwdDrop.setNodeRef} id="row_fwd" className="flex flex-1 items-center justify-center gap-2 sm:gap-3 lg:gap-4">
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
                                            <PlayerCard
                                                player={toPlayerCardData(p)}
                                                mode="pitch"
                                                showPosition={false}
                                                isCaptain={captainId === p.id}
                                                isVice={viceCaptainId === p.id && captainId !== p.id}
                                            />
                                        </div>
                                    </DraggablePlayer>
                                ))}
                            </div>

                            {/* MID Row */}
                            <div ref={midDrop.setNodeRef} id="row_mid" className="flex flex-1 items-center justify-center gap-2 sm:gap-3 lg:gap-4">
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
                                            <PlayerCard
                                                player={toPlayerCardData(p)}
                                                mode="pitch"
                                                showPosition={false}
                                                isCaptain={captainId === p.id}
                                                isVice={viceCaptainId === p.id && captainId !== p.id}
                                            />
                                        </div>
                                    </DraggablePlayer>
                                ))}
                            </div>

                            {/* DEF Row */}
                            <div ref={defDrop.setNodeRef} id="row_def" className="flex flex-1 items-center justify-center gap-2 sm:gap-3 lg:gap-4">
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
                                            <PlayerCard
                                                player={toPlayerCardData(p)}
                                                mode="pitch"
                                                showPosition={false}
                                                isCaptain={captainId === p.id}
                                                isVice={viceCaptainId === p.id && captainId !== p.id}
                                            />
                                        </div>
                                    </DraggablePlayer>
                                ))}
                            </div>

                            {/* GK Row */}
                            <div ref={gkDrop.setNodeRef} id="row_gk" className="flex flex-1 items-center justify-center gap-2 sm:gap-3 lg:gap-4">
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
                                            <PlayerCard
                                                player={toPlayerCardData(p)}
                                                mode="pitch"
                                                showPosition={false}
                                                isCaptain={captainId === p.id}
                                                isVice={viceCaptainId === p.id && captainId !== p.id}
                                            />
                                        </div>
                                    </DraggablePlayer>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DndContext>

            {/* Bench */}
            <div
                ref={benchDrop.setNodeRef}
                id="row_bench"
                className={`mt-4 max-w-full w-auto flex justify-center gap-3 p-3 bg-gradient-to-r from-slate-900/80 to-slate-800/80 border border-slate-700 rounded-xl min-h-[140px] overflow-visible transition-all shadow-lg relative ${benchDrop.isOver ? 'ring-2 ring-emerald-500' : ''
                    }`}
            >
                {/* Rasenstreifen-Overlay */}
                <div className="absolute inset-0 rounded-xl bg-[repeating-linear-gradient(90deg,rgba(20,83,45,0.15)_0,rgba(20,83,45,0.15)_8px,rgba(15,65,35,0.15)_8px,rgba(15,65,35,0.15)_16px)] pointer-events-none" />

                {/* Spieler-Content */}
                <div className="relative z-10 flex justify-center gap-3">
                    {benchLocal.map(b => (
                        <DraggablePlayer key={b.id} p={b}>
                            <PlayerCard player={toPlayerCardData(b)} mode="bench" showPosition={false} className="hover:border-emerald-500/60 hover:bg-slate-900/70 transition-colors" />
                        </DraggablePlayer>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - benchLocal.length) }).map((_, i) => (
                        <div
                            key={`empty-${i}`}
                            className={`w-[90px] h-[115px] rounded-lg bg-slate-900/40 border border-slate-700 flex items-center justify-center text-slate-500 text-[10px] hover:border-emerald-500/60 hover:bg-slate-900/70 transition-colors ${benchDrop.isOver ? 'ring-2 ring-emerald-500/70 ring-offset-2 ring-offset-slate-800' : ''}`}
                        >
                            Leer
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PitchXI;
