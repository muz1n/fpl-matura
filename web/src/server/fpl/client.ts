import { serverCache } from '@/src/server/cache'

const FPL_BASE = 'https://fantasy.premierleague.com/api'

export type CurrentGwInfo = {
    current: number
    deadline_time?: string
}

export function isFplApiEnabled() {
    return process.env.FPL_API_ENABLED === 'true'
}

export async function getCurrentGameweek(): Promise<CurrentGwInfo> {
    const cacheKey = 'fpl_current_gw'
    const cached = serverCache.get(cacheKey)
    if (cached) return cached as CurrentGwInfo

    if (!isFplApiEnabled()) {
        // Placeholder: return a static stub to keep the UI functional without real calls
        const stub = { current: 1, deadline_time: undefined }
        serverCache.set(cacheKey, stub, 60_000)
        return stub
    }

    // Real implementation (disabled by default):
    // const res = await fetch(`${FPL_BASE}/bootstrap-static/`, { headers: { 'user-agent': 'fpl-assistent-demo' } })
    // if (!res.ok) throw new Error(`FPL fetch failed: ${res.status}`)
    // const data = await res.json()
    // const current = data.events.find((e: any) => e.is_current) || data.events.find((e: any) => e.is_next)
    // const info: CurrentGwInfo = { current: current?.id ?? 1, deadline_time: current?.deadline_time }
    // serverCache.set(cacheKey, info, 5 * 60_000)
    // return info

    // As long as disabled, return stub
    const stub = { current: 1, deadline_time: undefined }
    serverCache.set(cacheKey, stub, 60_000)
    return stub
}

export type TeamId = number

export async function getTeamById(_teamId: TeamId) {
    // Placeholder for future implementation; do not call external APIs here
    return { teamId: _teamId, fetched: false }
}
