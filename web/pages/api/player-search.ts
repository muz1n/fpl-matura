import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

type PredictionPlayer = {
    player_id: number
    name: string
    team: string
    pos: string
    predicted_points: number
    price: number
}

function normalizeForSearch(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ø/g, 'o')
        .replace(/æ/g, 'ae')
        .replace(/ß/g, 'ss')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { q, position, team, minPrice, maxPrice, limit } = req.query
        const searchQuery = normalizeForSearch(q as string || '')
        const posFilter = (position as string || '').toUpperCase().trim()
        const teamFilter = (team as string || '').trim()
        const minPriceFilter = minPrice ? Number.parseFloat(minPrice as string) : undefined
        const maxPriceFilter = maxPrice ? Number.parseFloat(maxPrice as string) : undefined
        const maxResults = Number.parseInt(limit as string, 10) || 20

        const dataPath = path.join(process.cwd(), 'data', 'players_2023-24.json')

        if (!fs.existsSync(dataPath)) {
            console.error('Spieler-Daten nicht gefunden')
            return res.status(500).json({ error: 'Spieler-Daten nicht gefunden' })
        }

        const rawData = fs.readFileSync(dataPath, 'utf-8')
        const jsonData = JSON.parse(rawData)
        const allPlayers: PredictionPlayer[] = jsonData.players || []

        let filtered = posFilter ? allPlayers.filter(p => p.pos === posFilter) : allPlayers

        if (teamFilter) {
            filtered = filtered.filter(p => p.team === teamFilter)
        }

        if (minPriceFilter !== undefined) {
            filtered = filtered.filter(p => p.price >= minPriceFilter)
        }
        if (maxPriceFilter !== undefined) {
            filtered = filtered.filter(p => p.price <= maxPriceFilter)
        }

        if (searchQuery) {
            filtered = filtered.filter(p =>
                normalizeForSearch(p.name).includes(searchQuery) ||
                normalizeForSearch(p.team).includes(searchQuery)
            )
        }

        filtered.sort((a, b) => b.predicted_points - a.predicted_points)

        const results = filtered.slice(0, maxResults)

        const apiPlayers = results.map(p => ({
            name: p.name,
            position: p.pos,
            team: p.team,
            price: p.price,
            image: null,
            clubImage: null,
            predicted_points: p.predicted_points
        }))

        return res.status(200).json({ players: apiPlayers })

    } catch (err: any) {
        console.error('Error player-search:', err)
        return res.status(500).json({ error: err?.message ?? 'Unbekannter Fehler' })
    }
}
