import type { PredictionPlayer } from '../types/fpl'

// vereinfachte computeBestXI fuer Test (fixe Formation 3-5-2)
function bestXI(players: PredictionPlayer[]) {
    const gk = players.filter(p => p.pos === 'GK').sort((a, b) => b.predicted_points - a.predicted_points).slice(0, 1)
    const def = players.filter(p => p.pos === 'DEF').sort((a, b) => b.predicted_points - a.predicted_points).slice(0, 3)
    const mid = players.filter(p => p.pos === 'MID').sort((a, b) => b.predicted_points - a.predicted_points).slice(0, 5)
    const fwd = players.filter(p => p.pos === 'FWD').sort((a, b) => b.predicted_points - a.predicted_points).slice(0, 2)
    const xi = [...gk, ...def, ...mid, ...fwd]
    return { xi, sum: xi.reduce((a, p) => a + p.predicted_points, 0) }
}

function suggestTransfer(squad: PredictionPlayer[], universe: PredictionPlayer[]) {
    const base = bestXI(squad)
    let bestDelta = 0
    let bestOut: PredictionPlayer | undefined
    let bestIn: PredictionPlayer | undefined
    const ids = new Set(squad.map(p => p.player_id))
    const candidatesIn = universe.filter(p => !ids.has(p.player_id))
    for (const out of squad) {
        const reduced = squad.filter(p => p.player_id !== out.player_id)
        for (const inn of candidatesIn) {
            const xiNew = bestXI([...reduced, inn])
            const delta = xiNew.sum - base.sum
            if (delta > bestDelta + 1e-9 || (Math.abs(delta - bestDelta) < 1e-9 && inn.player_id < (bestIn?.player_id ?? Infinity))) {
                bestDelta = delta
                bestOut = out
                bestIn = inn
            }
        }
    }
    return { bestOut, bestIn, bestDelta }
}

const makePlayer = (id: number, pos: 'GK' | 'DEF' | 'MID' | 'FWD', pts: number): PredictionPlayer => ({
    player_id: id, name: `P${id}`, team: 'T', pos, predicted_points: pts, minutes_exp: 90, opponent: 'X', is_home: true, opp_strength: 1, price: 5
})

describe('transfer logic', () => {
    test('deterministischer out/in', () => {
        const universe = [
            makePlayer(1, 'GK', 2),
            makePlayer(2, 'DEF', 3), makePlayer(3, 'DEF', 5), makePlayer(4, 'DEF', 4),
            makePlayer(5, 'MID', 6), makePlayer(6, 'MID', 2), makePlayer(7, 'MID', 7), makePlayer(8, 'MID', 1), makePlayer(9, 'MID', 3),
            makePlayer(10, 'FWD', 5), makePlayer(11, 'FWD', 4),
            // candidates not in squad
            makePlayer(12, 'MID', 9), makePlayer(13, 'DEF', 6)
        ]
        const squad = universe.filter(p => p.player_id <= 11)
        const { bestOut, bestIn, bestDelta } = suggestTransfer(squad, universe)
        expect(bestDelta).toBeGreaterThan(0)
        // MID mit hohem Wert 12 sollte rein kommen
        expect(bestIn?.player_id).toBe(12)
        // Out sollte geringere Punkte haben als Ersatz; deterministische Tie-break fuer gleiche Delta
        expect(bestOut).toBeTruthy()
    })
})
