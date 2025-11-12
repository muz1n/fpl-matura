import fs from 'fs'
import path from 'path'
import type { PredictionsPayload, LineupPayload } from '../types/fpl'
import { validateLineup } from '../lib/lineup-helpers'

describe('Demo JSON Data', () => {
    let predictions: PredictionsPayload
    let lineup: LineupPayload

    beforeAll(() => {
        // Load JSON files from public/demo
        const predictionsPath = path.join(process.cwd(), 'public', 'demo', 'predictions_gw38.json')
        const lineupPath = path.join(process.cwd(), 'public', 'demo', 'lineup_gw38.json')

        const predictionsRaw = fs.readFileSync(predictionsPath, 'utf-8')
        const lineupRaw = fs.readFileSync(lineupPath, 'utf-8')

        predictions = JSON.parse(predictionsRaw) as PredictionsPayload
        lineup = JSON.parse(lineupRaw) as LineupPayload
    })

    describe('PredictionsPayload', () => {
        test('has required top-level fields', () => {
            expect(predictions).toHaveProperty('season')
            expect(predictions).toHaveProperty('gw')
            expect(predictions).toHaveProperty('generated_at')
            expect(predictions).toHaveProperty('model_version')
            expect(predictions).toHaveProperty('players')
        })

        test('has at least one player', () => {
            expect(predictions.players.length).toBeGreaterThan(0)
        })

        test('players have required fields', () => {
            const player = predictions.players[0]
            expect(player).toHaveProperty('player_id')
            expect(player).toHaveProperty('name')
            expect(player).toHaveProperty('team')
            expect(player).toHaveProperty('pos')
            expect(player).toHaveProperty('predicted_points')
            expect(player).toHaveProperty('minutes_exp')
            expect(player).toHaveProperty('opponent')
            expect(player).toHaveProperty('is_home')
            expect(player).toHaveProperty('opp_strength')
            expect(player).toHaveProperty('price')
        })

        test('player positions are valid', () => {
            const validPositions = ['GK', 'DEF', 'MID', 'FWD']
            predictions.players.forEach(player => {
                expect(validPositions).toContain(player.pos)
            })
        })

        test('player IDs are unique', () => {
            const ids = predictions.players.map(p => p.player_id)
            const uniqueIds = new Set(ids)
            expect(uniqueIds.size).toBe(ids.length)
        })

        test('predicted points are non-negative', () => {
            predictions.players.forEach(player => {
                expect(player.predicted_points).toBeGreaterThanOrEqual(0)
            })
        })
    })

    describe('LineupPayload', () => {
        test('has required top-level fields', () => {
            expect(lineup).toHaveProperty('season')
            expect(lineup).toHaveProperty('gw')
            expect(lineup).toHaveProperty('generated_at')
            expect(lineup).toHaveProperty('model_version')
            expect(lineup).toHaveProperty('formation')
            expect(lineup).toHaveProperty('xi_ids')
            expect(lineup).toHaveProperty('bench_gk_id')
            expect(lineup).toHaveProperty('bench_out_ids')
            expect(lineup).toHaveProperty('captain_id')
            expect(lineup).toHaveProperty('vice_id')
            expect(lineup).toHaveProperty('xi_points_sum')
        })

        test('xi_ids has exactly 11 players', () => {
            expect(lineup.xi_ids).toHaveLength(11)
        })

        test('xi_ids are unique', () => {
            const uniqueIds = new Set(lineup.xi_ids)
            expect(uniqueIds.size).toBe(11)
        })

        test('bench_out_ids has exactly 3 players', () => {
            expect(lineup.bench_out_ids).toHaveLength(3)
        })

        test('formation is valid', () => {
            const validFormations = ['3-4-3', '3-5-2', '4-4-2', '4-3-3', '4-5-1', '5-4-1', '5-3-2']
            expect(validFormations).toContain(lineup.formation)
        })

        test('captain is in XI', () => {
            expect(lineup.xi_ids).toContain(lineup.captain_id)
        })

        test('vice captain is in XI', () => {
            expect(lineup.xi_ids).toContain(lineup.vice_id)
        })

        test('captain and vice are different', () => {
            expect(lineup.captain_id).not.toBe(lineup.vice_id)
        })

        test('bench GK is not in XI', () => {
            expect(lineup.xi_ids).not.toContain(lineup.bench_gk_id)
        })

        test('bench outfield players are not in XI', () => {
            lineup.bench_out_ids.forEach(id => {
                expect(lineup.xi_ids).not.toContain(id)
            })
        })

        test('xi_points_sum is non-negative', () => {
            expect(lineup.xi_points_sum).toBeGreaterThanOrEqual(0)
        })
    })

    describe('Cross-validation', () => {
        test('all XI player IDs exist in predictions', () => {
            const playerIds = new Set(predictions.players.map(p => p.player_id))
            lineup.xi_ids.forEach(id => {
                expect(playerIds.has(id)).toBe(true)
            })
        })

        test('bench GK exists in predictions', () => {
            const playerIds = new Set(predictions.players.map(p => p.player_id))
            expect(playerIds.has(lineup.bench_gk_id)).toBe(true)
        })

        test('all bench outfield IDs exist in predictions', () => {
            const playerIds = new Set(predictions.players.map(p => p.player_id))
            lineup.bench_out_ids.forEach(id => {
                expect(playerIds.has(id)).toBe(true)
            })
        })

        test('XI contains exactly one goalkeeper', () => {
            const playerMap = new Map(predictions.players.map(p => [p.player_id, p]))
            const xiPlayers = lineup.xi_ids.map(id => playerMap.get(id)).filter(p => p !== undefined)
            const gkCount = xiPlayers.filter(p => p!.pos === 'GK').length
            expect(gkCount).toBe(1)
        })

        test('bench GK is actually a goalkeeper', () => {
            const benchGK = predictions.players.find(p => p.player_id === lineup.bench_gk_id)
            expect(benchGK?.pos).toBe('GK')
        })

        test('validateLineup helper returns ok=true', () => {
            const validation = validateLineup(lineup, predictions.players)
            if (!validation.ok) {
                console.error('Validation issues:', validation.issues)
            }
            expect(validation.ok).toBe(true)
            expect(validation.issues).toHaveLength(0)
        })
    })
})
