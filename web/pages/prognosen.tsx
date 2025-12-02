import React, { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { motion } from "framer-motion";
import type {
    PredictionsPayload,
    LineupPayload,
    PredictionPlayer,
} from "@/types/fpl";
import { Select } from "@/src/components/Select";
import { getUsableSeasons } from "../lib/seasonQuality";
import { TrendingUp, Trophy, TrendingDown, Medal } from "lucide-react";

type LoadingStateType = "idle" | "loading" | "success" | "error";
type PredictionMethod = "rf" | "ma3" | "pos" | "rf_rank" | "rf_pos";

// Methoden-Optionen mit deutschen Namen
const methodOptions = [
    { value: "rf", label: "Random Forest (Standard)" },
    { value: "rf_rank", label: "Random Forest (Rank)" },
    { value: "rf_pos", label: "Random Forest (Position)" },
    { value: "rf_relaxed", label: "Random Forest (Relaxed)" },
    { value: "ma3", label: "Formdurchschnitt (MA3)" },
    { value: "pos", label: "Positionsmittel (POS)" },
];

// erlaubte Formationen nur für evtl. spätere Features
const allowedFormations: Array<{ f: string; DEF: number; MID: number; FWD: number }> = [
    { f: "3-4-3", DEF: 3, MID: 4, FWD: 3 },
    { f: "3-5-2", DEF: 3, MID: 5, FWD: 2 },
    { f: "4-4-2", DEF: 4, MID: 4, FWD: 2 },
    { f: "4-3-3", DEF: 4, MID: 3, FWD: 3 },
    { f: "4-5-1", DEF: 4, MID: 5, FWD: 1 },
    { f: "5-4-1", DEF: 5, MID: 4, FWD: 1 },
    { f: "5-3-2", DEF: 5, MID: 3, FWD: 2 },
];

export default function PredictionsPage() {
    // Daten
    const [predictions, setPredictions] = useState<PredictionsPayload | null>(null);
    const [lineup, setLineup] = useState<LineupPayload | null>(null);

    // Ladezustand
    const [state, setState] = useState<LoadingStateType>("idle");
    const [error, setError] = useState<string>("");

    // Meta-Infos zu Gameweeks / Methoden
    const [availableGWs, setAvailableGWs] = useState<number[]>([]);
    const [methodsByGw, setMethodsByGw] = useState<Record<number, string[]>>({});
    const [gwLoadingState, setGwLoadingState] = useState<
        "idle" | "loading" | "loaded" | "error"
    >("idle");
    const [gwError, setGwError] = useState<string>("");

    // Auswahl-States
    const [selectedSeason, setSelectedSeason] = useState<string>("2023-24");
    const [availableSeasons, setAvailableSeasons] = useState<string[]>([]);
    const [seasonsLoading, setSeasonsLoading] = useState<boolean>(true);

    const [selectedGW, setSelectedGW] = useState<number | null>(null);
    const [selectedMethod, setSelectedMethod] = useState<string | null>("rf");

    // ---------- Seasons laden ----------

    useEffect(() => {
        function loadSeasons() {
            try {
                const seasons = getUsableSeasons();
                setAvailableSeasons(seasons);

                // Falls Season leer, nimm neueste
                if (!selectedSeason && seasons.length > 0) {
                    setSelectedSeason(seasons[seasons.length - 1]);
                }
            } catch (err) {
                console.error("Fehler beim Laden der Seasons", err);
            } finally {
                setSeasonsLoading(false);
            }
        }

        loadSeasons();
        // bewusst kein selectedSeason in deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---------- Meta: verfügbare GWs + Methoden pro GW ----------

    const loadMeta = useCallback(
        async (season: string) => {
            if (!season) return;

            setGwLoadingState("loading");
            setGwError("");

            try {
                const res = await fetch(`/api/predictions/meta?season=${encodeURIComponent(season)}`);
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const meta = await res.json() as {
                    season: string;
                    gws: number[];
                    methods_by_gw?: Record<number, string[]>;
                };

                const gws = meta.gws ?? [];
                setAvailableGWs(gws);
                setMethodsByGw(meta.methods_by_gw ?? {});

                // Wenn noch kein GW gewählt wurde, nimm den höchsten verfügbaren
                if (gws.length > 0 && selectedGW === null) {
                    setSelectedGW(gws[gws.length - 1]);
                }

                setGwLoadingState("loaded");
            } catch (err: any) {
                console.error("Fehler beim Laden der Meta-Daten", err);
                setGwError("Meta-Daten konnten nicht geladen werden.");
                setGwLoadingState("error");
            }
        },
        [selectedGW]
    );

    useEffect(() => {
        if (selectedSeason) {
            loadMeta(selectedSeason);
        }
    }, [selectedSeason, loadMeta]);

    // ---------- Prognosen + Lineup laden ----------

    const loadData = useCallback(
        async (season: string, gw: number, method: string) => {
            setState("loading");
            setError("");
            setPredictions(null);
            setLineup(null);

            try {
                const qs = `season=${encodeURIComponent(season)}&gw=${gw}&method=${encodeURIComponent(
                    method
                )}`;

                const [predRes, lineupRes] = await Promise.all([
                    fetch(`/api/predictions?${qs}`),
                    fetch(`/api/lineup?${qs}`),
                ]);

                if (!predRes.ok) {
                    throw new Error(`Predictions HTTP ${predRes.status}`);
                }

                const predJson = (await predRes.json()) as PredictionsPayload;
                setPredictions(predJson);

                if (lineupRes.ok) {
                    const lineupJson = (await lineupRes.json()) as LineupPayload;
                    setLineup(lineupJson);
                } else {
                    setLineup(null);
                }

                setState("success");
            } catch (err: any) {
                console.error("Fehler beim Laden der Prognosen", err);
                setError("Prognosen oder Aufstellung konnten nicht geladen werden.");
                setState("error");
            }
        },
        []
    );

    useEffect(() => {
        if (selectedSeason && selectedGW !== null && selectedMethod) {
            loadData(selectedSeason, selectedGW, selectedMethod);
        }
    }, [selectedSeason, selectedGW, selectedMethod, loadData]);

    // ---------- Hilfsvariablen fürs Layout ----------

    // Fallback: 1-38, falls Meta nichts liefert
    const fallbackGWs = Array.from({ length: 38 }, (_, i) => i + 1);
    const gwList = availableGWs.length ? availableGWs : fallbackGWs;

    const gameweekOptions = gwList.map((gw) => ({
        value: gw,
        label: `Spielwoche ${gw}`,
    }));

    const defaultMethods = methodOptions.map((o) => o.value);
    const availableMethods: string[] =
        selectedGW !== null ? methodsByGw[selectedGW] ?? defaultMethods : defaultMethods;

    const isLegacyLineup = lineup?.methode === "legacy";

    const selectedMethodLabel =
        (selectedMethod && methodOptions.find((o) => o.value === selectedMethod)?.label) ||
        selectedMethod ||
        "-";

    const sortedPlayers = [...(predictions?.players ?? [])].sort(
        (a, b) => b.predicted_points - a.predicted_points
    );
    const tablePlayers = sortedPlayers.slice(0, 50);

    const findPlayer = (id: number): PredictionPlayer | undefined =>
        predictions?.players.find((p) => p.player_id === id);

    const xiPlayers = (() => {
        if (!lineup || !predictions) return [];
        const posOrder: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
        const xi = lineup.xi_ids
            .map(findPlayer)
            .filter((p): p is PredictionPlayer => p !== undefined);

        return xi.sort((a, b) => {
            const posCompare = posOrder[a.pos] - posOrder[b.pos];
            if (posCompare !== 0) return posCompare;
            return b.predicted_points - a.predicted_points;
        });
    })();

    // ---------- Render ----------

    return (
        <>
            <Head>
                <title>Prognosen - FPL Matura</title>
            </Head>

            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="min-h-screen text-slate-100"
            >
                <div className="mx-auto px-4 pt-12 pb-16 space-y-6 max-w-7xl">
                    {/* Hero-Titel */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center space-y-3 mb-8"
                    >
                        <div className="flex items-center justify-center gap-3">
                            <TrendingUp className="w-10 h-10 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600" />
                            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                                Prognosen und Aufstellung
                            </h1>
                        </div>
                        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
                            Erwartete Punkte für alle Spieler nach Spielwoche und Methode
                        </p>
                    </motion.div>

                    {/* Toolbar oben */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="bg-slate-800/90 border border-pink-500/20 rounded-2xl shadow-lg p-6"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Season */}
                            <Select
                                label="Season"
                                value={selectedSeason}
                                onChange={(val) => setSelectedSeason(val as string)}
                                options={availableSeasons.map((s) => ({
                                    value: s,
                                    label: `Season ${s}`,
                                }))}
                                disabled={seasonsLoading || availableSeasons.length === 0}
                            />

                            {/* Spielwoche */}
                            <Select
                                label="Spielwoche"
                                value={selectedGW ?? gwList[0] ?? 1}
                                onChange={(val) => setSelectedGW(Number(val))}
                                options={gameweekOptions}
                                disabled={gwLoadingState === "loading" && availableGWs.length === 0}
                            />

                            {/* Methode */}
                            <div className="relative">
                                <Select
                                    label="Prognosemethode"
                                    value={selectedMethod ?? ""}
                                    onChange={(val) => setSelectedMethod(val as string)}
                                    options={methodOptions.map((m) => ({
                                        value: m.value,
                                        label: m.label,
                                    }))}
                                    disabled={
                                        availableMethods.length === 0 ||
                                        (availableMethods.length === 1 && availableMethods[0] === "legacy")
                                    }
                                />
                                {isLegacyLineup && (
                                    <span className="absolute top-2 right-2 px-2 py-1 text-[11px] font-semibold rounded-full bg-amber-500/10 text-amber-300 border border-amber-400/60 shadow">
                                        Legacy
                                    </span>
                                )}
                            </div>
                        </div>

                        {availableMethods.length === 0 && (
                            <div className="text-sm text-slate-400 mt-2">
                                Keine Prognosemethode für diese Spielwoche verfügbar.
                            </div>
                        )}
                        {availableMethods.length === 1 && availableMethods[0] === "legacy" && (
                            <div className="text-sm text-slate-400 mt-2">
                                Nur Legacy-Daten für diese Spielwoche vorhanden. Prognoseauswahl deaktiviert.
                            </div>
                        )}
                    </motion.div>

                    {/* Fehlermeldung */}
                    {state === "error" && (
                        <div className="bg-red-900/40 border border-red-700 text-red-200 rounded-xl px-4 py-3 text-sm">
                            {error || "Es ist ein Fehler beim Laden der Prognosen aufgetreten."}
                        </div>
                    )}

                    {/* Hauptinhalt: Tabelle + Aufstellung nebeneinander (auf grossen Screens) */}
                    <div className={`grid gap-6 items-start ${lineup ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
                        {/* Prognose-Tabelle */}
                        <div className={`bg-slate-800/90 border border-pink-500/20 rounded-2xl shadow-lg p-6 ${lineup ? 'lg:col-span-2' : ''}`}>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-pink-400">
                                        Prognose-Tabelle
                                    </h2>
                                    <p className="text-xs md:text-sm text-slate-400">
                                        Top {tablePlayers.length} Spieler nach erwarteten Punkten in
                                        dieser Spielwoche.
                                    </p>
                                </div>
                                <span className="text-xs md:text-sm text-slate-400 border border-slate-600 rounded-full px-3 py-1">
                                    {sortedPlayers.length} Spieler insgesamt
                                </span>
                            </div>

                            {state === "loading" && (
                                <div className="py-10 text-center text-slate-400 text-sm">
                                    Lade Prognosen ...
                                </div>
                            )}

                            {state === "success" && tablePlayers.length === 0 && (
                                <div className="py-10 text-center text-slate-400 text-sm">
                                    Keine Prognosedaten für diese Auswahl gefunden.
                                </div>
                            )}

                            {tablePlayers.length > 0 && (
                                <div className="overflow-x-auto">
                                    <table className="w-full table-auto text-left border-collapse">
                                        <thead>
                                            <tr className="border-b-2 border-pink-500/30 text-xs uppercase tracking-wide text-pink-400/80">
                                                <th className="py-3 pr-3">Rang</th>
                                                <th className="py-3 pr-3">Spieler</th>
                                                <th className="py-3 pr-3">Team</th>
                                                <th className="py-3 pr-3">Pos</th>
                                                <th className="py-3 pr-3 text-right">Prognose</th>
                                                <th className="py-3 pl-3 text-right">Preis</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {tablePlayers.map((p, idx) => {
                                                const isTopPlayer = idx < 3;
                                                const isHighScore = p.predicted_points >= 7;
                                                const posColors: Record<string, string> = {
                                                    GK: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
                                                    DEF: "bg-green-500/20 text-green-300 border-green-500/30",
                                                    MID: "bg-blue-500/20 text-blue-300 border-blue-500/30",
                                                    FWD: "bg-red-500/20 text-red-300 border-red-500/30",
                                                };

                                                return (
                                                    <tr
                                                        key={p.player_id}
                                                        className={`border-b border-slate-800/80 hover:bg-gradient-to-r hover:from-slate-700/50 hover:via-pink-900/15 hover:to-slate-700/50 transition-all duration-150 ${isTopPlayer ? 'bg-pink-500/5' : ''
                                                            }`}
                                                    >
                                                        <td className="py-3 pr-3">
                                                            {isTopPlayer ? (
                                                                <div className="flex items-center gap-1">
                                                                    {idx === 0 && <Trophy className="w-4 h-4 text-yellow-400" />}
                                                                    {idx === 1 && <Medal className="w-4 h-4 text-slate-300" />}
                                                                    {idx === 2 && <Medal className="w-4 h-4 text-orange-400" />}
                                                                    <span className="text-pink-400 font-bold">{idx + 1}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-400">{idx + 1}</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 pr-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-100 font-medium">{p.name}</span>
                                                                {isHighScore && (
                                                                    <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 pr-3 text-slate-300">{p.team}</td>
                                                        <td className="py-3 pr-3">
                                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${posColors[p.pos] || "bg-slate-700 text-slate-300"}`}>
                                                                {p.pos}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 pr-3 text-right">
                                                            <span className={`font-bold ${p.predicted_points >= 7 ? 'text-green-400' :
                                                                p.predicted_points >= 5 ? 'text-pink-400' :
                                                                    'text-slate-400'
                                                                }`}>
                                                                {p.predicted_points.toFixed(1)}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 pl-3 text-right text-slate-300 font-medium">
                                                            £{p.price.toFixed(1)}m
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Aufstellungs-Karte rechts - nur anzeigen wenn Lineup vorhanden */}
                        {lineup && (
                            <div className="bg-slate-800/90 border border-pink-500/20 rounded-2xl shadow-lg p-6">
                                <h2 className="text-xl font-semibold text-pink-400 mb-2">
                                    Empfohlene Aufstellung
                                </h2>
                                <p className="text-xs text-slate-400 mb-3">
                                    Formation: {lineup.formation} • Gesamtpunkte XI:{" "}
                                    <span className="text-pink-400 font-semibold">
                                        {lineup.xi_points.toFixed(1)}
                                    </span>
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-200 mb-1">
                                            Startelf
                                        </h3>
                                        <div className="space-y-1 text-sm">
                                            {xiPlayers.map((p) => (
                                                <div
                                                    key={p.player_id}
                                                    className="flex items-center justify-between bg-slate-900/60 rounded-lg px-3 py-1.5"
                                                >
                                                    <span className="text-slate-100">
                                                        {p.name}{" "}
                                                        <span className="text-xs text-slate-400">
                                                            ({p.team} · {p.pos})
                                                        </span>
                                                    </span>
                                                    <span className="text-pink-400 font-semibold">
                                                        {p.predicted_points.toFixed(1)} Pkt
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {lineup.bench_ids && lineup.bench_ids.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-200 mb-1">
                                                Bank
                                            </h3>
                                            <div className="space-y-1 text-sm">
                                                {lineup.bench_ids
                                                    .map(findPlayer)
                                                    .filter((p): p is PredictionPlayer => p != null)
                                                    .map((p) => (
                                                        <div
                                                            key={p.player_id}
                                                            className="flex items-center justify-between bg-slate-900/40 rounded-lg px-3 py-1.5"
                                                        >
                                                            <span className="text-slate-100">
                                                                {p.name}{" "}
                                                                <span className="text-xs text-slate-400">
                                                                    ({p.team} · {p.pos})
                                                                </span>
                                                            </span>
                                                            <span className="text-slate-300">
                                                                {p.predicted_points.toFixed(1)} Pkt
                                                            </span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.main>
        </>
    );
}
