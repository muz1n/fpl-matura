import type { NextApiRequest, NextApiResponse } from 'next'
import path from 'path'
import fs from 'fs'
import { parse } from 'csv-parse/sync'
import { globalLimiter } from '@/src/server/rateLimit'

// In-Memory Cache per Season to avoid re-parsing on every request
const seasonCache: Map<string, PlayerRow[]> = new Map()

// Types for unified player result
export type PlayerResult = {
    name: string
    position: string
    team: string | null
    price: number | null
    predicted_points: number | null
    photo_code: number | null
    image: string | null
    clubImage: string | null
    playerId?: number
}

// Internal raw shape after normalization from different sources
type PlayerRow = {
    name: string
    position: string
    team: string | null
    price: number | null
    predicted_points: number | null
    photo_code: number | null
    playerId?: number
}

function normalizeString(s: string) {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
}

function slugify(s: string) {
    return normalizeString(s)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

// Optional mapping loader for team codes and player photo codes
function loadJsonIfExists<T = any>(relPathFromWebRoot: string): T | null {
    try {
        const cwd = process.cwd()
        const p = path.resolve(cwd, relPathFromWebRoot)
        if (!fs.existsSync(p)) return null
        const raw = fs.readFileSync(p, 'utf8')
        return JSON.parse(raw) as T
    } catch {
        return null
    }
}

function svgDataUrl(text: string, bg = '#1f2937', fg = '#e5e7eb'): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250">` +
        `<rect width="250" height="250" fill="${bg}"/>` +
        `<text x="125" y="125" dominant-baseline="middle" text-anchor="middle" fill="${fg}" ` +
        `font-family="Arial,sans-serif" font-size="64" font-weight="700">${text}</text></svg>`
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

function initialsFromName(name: string): string {
    const parts = name.split(/\s+/).filter(Boolean)
    const first = parts[0]?.[0] || ''
    const last = parts[parts.length - 1]?.[0] || ''
    return (first + last).toUpperCase()
}

function crestUrlFromTeam(team: string | null, season: string): string | null {
    if (!team) return null
    // Prefer local season-specific crest if available
    const crestRel = path.join('public', 'club-crests', season, `${slugify(team)}.png`)
    const crestAbs = path.resolve(process.cwd(), crestRel)
    if (fs.existsSync(crestAbs)) {
        return `/${path.posix.join('club-crests', season, `${slugify(team)}.png`)}`
    }
    // Try optional mapping file: ./public/mappings/team_codes_by_season.json
    type TeamCodes = { [season: string]: { [teamName: string]: string | number } }
    const codes = loadJsonIfExists<TeamCodes>('public/mappings/team_codes_by_season.json')
    const code = codes?.[season]?.[team]
    if (code !== undefined && code !== null && String(code).trim() !== '') {
        return `https://resources.premierleague.com/premierleague/badges/70/t${code}.png`
    }
    // Fallback: inline SVG with team initials
    return svgDataUrl(initialsFromName(team), '#111827', '#f9fafb')
}

// Liefert Headshot URL. Verwendet Standard 110x140 Format, da dieses stabiler ist.
// Falls kein photo_code vorhanden: Inline SVG Placeholder mit Initialen.
function headshotUrlFromPlayer(p: PlayerRow): string | null {
    if (p.photo_code && !Number.isNaN(p.photo_code)) {
        // Standard FPL Pfad (110x140). Falls Bild 404 liefert, Client wechselt via onError auf Platzhalter.
        return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${p.photo_code}.png`
    }
    return svgDataUrl(initialsFromName(p.name), '#0f766e', '#ecfeff')
}

function resolveDataPathForSeason(season: string): { type: 'merged' | 'cleaned' | 'none'; filePath: string | null } {
    const cwd = process.cwd() // web folder
    const merged = path.resolve(cwd, '..', 'data', `merged_gw_${season}.csv`)
    if (fs.existsSync(merged)) return { type: 'merged', filePath: merged }
    const cleaned = path.resolve(cwd, '..', 'data', `cleaned_players_${season}.csv`)
    if (fs.existsSync(cleaned)) return { type: 'cleaned', filePath: cleaned }
    return { type: 'none', filePath: null }
}

function buildSeasonIndexFromMerged(filePath: string): PlayerRow[] {
    const content = fs.readFileSync(filePath, 'utf8')
    const rows: any[] = parse(content, { columns: true, skip_empty_lines: true })

    // Keep the latest GW row per player_id
    const byId = new Map<string, any>()
    for (const r of rows) {
        const pid = String(r.player_id ?? r.id ?? '')
        if (!pid) continue
        // Use GW if available, else kickoff_time
        const gw = Number(r.GW ?? r.gw ?? 0)
        const prev = byId.get(pid)
        if (!prev || gw >= Number(prev.GW ?? prev.gw ?? 0)) {
            byId.set(pid, r)
        }
    }

    const out: PlayerRow[] = []
    // Load photo codes mapping for season if present
    const season = path.basename(filePath).replace(/^merged_gw_|\.csv$/g, '')
    type PhotoCodes = { [playerName: string]: number }
    const photoMapping = loadJsonIfExists<PhotoCodes>(`public/mappings/player_photo_codes/${season}.json`) || {}

    for (const [pid, r] of byId.entries()) {
        const name = String(r.name || '').trim()
        const position = String(r.pos || '').trim()
        const team = r.team ? String(r.team).trim() : null
        const rawPrice = r.price !== undefined && r.price !== '' ? Number(r.price) : null
        const price = rawPrice !== null && !Number.isNaN(rawPrice) ? rawPrice / 10 : null
        // Use xP as predicted points if available
        const predicted_points = r.xP !== undefined && r.xP !== '' ? Number(r.xP) : null
        const playerId = Number(pid)
        const photo_code = photoMapping[name] || null
        out.push({ name, position, team, price, predicted_points, photo_code, playerId })
    }
    return out
}

function buildSeasonIndexFromCleaned(filePath: string): PlayerRow[] {
    const content = fs.readFileSync(filePath, 'utf8')
    const rows: any[] = parse(content, { columns: true, skip_empty_lines: true })
    // Cleaned player list lacks predicted points; set null
    const season = path.basename(filePath).replace(/^cleaned_players_|\.csv$/g, '')
    type PhotoCodes = { [playerName: string]: number }
    const photoMapping = loadJsonIfExists<PhotoCodes>(`public/mappings/player_photo_codes/${season}.json`) || {}

    const out: PlayerRow[] = rows.map((r: any, idx: number) => {
        const first = String(r.first_name || '').trim()
        const second = String(r.second_name || '').trim()
        const name = [first, second].filter(Boolean).join(' ')
        const position = String(r.element_type || '').trim()
        const rawPrice = r.now_cost !== undefined && r.now_cost !== '' ? Number(r.now_cost) : null
        const price = rawPrice !== null && !Number.isNaN(rawPrice) ? rawPrice / 10 : null
        const photo_code = photoMapping[name] || null
        return { name, position, team: null, price, predicted_points: null, photo_code, playerId: idx }
    })
    return out
}

async function getSeasonPlayers(season: string): Promise<PlayerRow[]> {
    if (seasonCache.has(season)) return seasonCache.get(season) as PlayerRow[]
    const resolved = resolveDataPathForSeason(season)
    if (resolved.type === 'none' || !resolved.filePath) {
        seasonCache.set(season, [])
        return []
    }
    let data: PlayerRow[] = []
    if (resolved.type === 'merged') data = buildSeasonIndexFromMerged(resolved.filePath)
    else data = buildSeasonIndexFromCleaned(resolved.filePath)
    seasonCache.set(season, data)
    return data
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

    // Rate limit per IP
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
    if (!globalLimiter.allow(`players:${ip}`)) {
        return res.status(429).json({ error: 'Rate limit exceeded' })
    }

    try {
        const season = String(req.query.season || '').trim()
        const q = String(req.query.q || '').trim()
        const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 20)))

        if (!season) return res.status(400).json({ error: 'Missing required parameter: season' })
        if (!q) return res.status(400).json({ error: 'Missing required parameter: q' })

        const players = await getSeasonPlayers(season)
        if (!players.length) return res.status(404).json({ error: `Keine Spielerdaten für Season ${season} gefunden` })

        const nq = normalizeString(q)

        const filtered = players
            .filter((p) => normalizeString(p.name).includes(nq))
            .slice(0, limit)

        const results: PlayerResult[] = filtered.map((p) => ({
            name: p.name,
            position: p.position,
            team: p.team,
            price: p.price,
            predicted_points: p.predicted_points,
            photo_code: p.photo_code,
            image: headshotUrlFromPlayer(p),
            clubImage: crestUrlFromTeam(p.team ?? null, season),
            playerId: p.playerId,
        }))

        return res.status(200).json({ season, q, count: results.length, results })
    } catch (e: any) {
        return res.status(500).json({ error: e?.message || 'Unknown error' })
    }
}
