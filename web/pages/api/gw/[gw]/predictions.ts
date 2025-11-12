import type { NextApiRequest, NextApiResponse } from 'next'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PredictionsPayloadSchema } from '@/src/types/fpl.schema'
import { z } from 'zod'

const OUT_DIR = process.env.FPL_OUT_DIR || join(process.cwd(), '..', 'out')

// Unterstützte Methoden
type PredictionMethod = 'rf' | 'ma3' | 'pos'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { gw, methode } = req.query
        const gwNum = Number.parseInt(gw as string, 10)
        const methodRaw = (methode as string)?.toLowerCase()
        const method: PredictionMethod = (methodRaw === 'ma3' || methodRaw === 'pos' || methodRaw === 'rf') ? methodRaw : 'rf'

        if (!Number.isFinite(gwNum)) {
            return res.status(400).json({ error: 'Bad gw parameter' })
        }

        // Validiere Methode
        const validMethods: PredictionMethod[] = ['rf', 'ma3', 'pos']
        if (!validMethods.includes(method as PredictionMethod)) {
            return res.status(400).json({
                error: `Invalid method. Use: ${validMethods.join(', ')}`
            })
        }

        // Immer Basisdatei (RF) laden – andere Methoden werden dynamisch berechnet oder gefiltert
        const baseFilename = `predictions_gw${gwNum}.json`
        const file = join(OUT_DIR, baseFilename)
        let raw: string
        try {
            raw = await readFile(file, 'utf8')
        } catch (e: any) {
            if (e.code === 'ENOENT') {
                return res.status(404).json({ error: 'Datei fehlt fuer diese Spielwoche' })
            }
            throw e
        }

        let json: any
        try {
            json = JSON.parse(raw)
        } catch {
            return res.status(422).json({ error: 'Ungueltiges JSON Format' })
        }

        // Zod Validierung
        const parseResult = PredictionsPayloadSchema.safeParse(json)
        if (!parseResult.success) {
            return res.status(422).json({ error: 'Validierungsfehler', details: parseResult.error.issues.map(i => i.message) })
        }
        const base = parseResult.data

        // Methode-Anpassungen
        if (method === 'rf') {
            return res.status(200).json(base)
        }

        if (method === 'ma3') {
            // Falls Spieler zusaetzliches Feld ma3 hat: predicted_points ersetzen; sonst RF behalten
            const players = base.players.map(p => {
                const ma3Val = (p as any).ma3
                return typeof ma3Val === 'number'
                    ? { ...p, predicted_points: ma3Val }
                    : p
            })
            return res.status(200).json({ ...base, players, model_version: base.model_version + '+ma3' })
        }

        if (method === 'pos') {
            // Positionsmittel berechnen: Durchschnitt RF Punkte pro Position ersetzen fuer alle Spieler
            const byPos: Record<string, { sum: number; count: number }> = {}
            for (const p of base.players) {
                if (!byPos[p.pos]) byPos[p.pos] = { sum: 0, count: 0 }
                byPos[p.pos].sum += p.predicted_points
                byPos[p.pos].count += 1
            }
            const avg: Record<string, number> = {}
            Object.entries(byPos).forEach(([pos, v]) => {
                avg[pos] = v.count > 0 ? v.sum / v.count : 0
            })
            const players = base.players.map(p => ({ ...p, predicted_points: avg[p.pos] ?? p.predicted_points }))
            return res.status(200).json({ ...base, players, model_version: base.model_version + '+pos' })
        }

        return res.status(200).json(base)
    } catch (err: any) {
        console.error('Error reading predictions:', err)

        // Bessere Fehlermeldungen
        if (err.code === 'ENOENT') {
            return res.status(404).json({
                error: 'Keine Daten für diese Kombination verfügbar'
            })
        }

        return res.status(500).json({ error: err?.message ?? 'read error' })
    }
}
