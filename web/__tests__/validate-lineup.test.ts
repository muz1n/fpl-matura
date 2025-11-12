import { validateLineup } from '../lib/lineup-helpers'
import type { LineupPayload, PredictionPlayer } from '../types/fpl'

describe('validateLineup', () => {
    // Mock players data
    const mockPlayers: PredictionPlayer[] = [
        // Goalkeepers
        {
            player_id: 1,
            name: 'GK One',
            team: 'MCI',
            pos: 'GK',
            predicted_points: 5.0,
            minutes_exp: 90,
            opponent: 'CHE',
            is_home: true,
            opp_strength: 3.5,
            price: 5.0
        },
        {
            player_id: 2,
            name: 'GK Two',
            team: 'LIV',
            pos: 'GK',
            predicted_points: 4.5,
            minutes_exp: 90,
            opponent: 'ARS',
            is_home: false,
            opp_strength: 3.8,
            price: 5.5
        },
        // Defenders
        {
            player_id: 3,
            name: 'Defender One',
            team: 'MCI',
            pos: 'DEF',
            predicted_points: 6.0,
            minutes_exp: 90,
            opponent: 'CHE',
            is_home: true,
            opp_strength: 3.5,
            price: 6.0
        },
        {
            player_id: 4,
            name: 'Defender Two',
            team: 'LIV',
            pos: 'DEF',
            predicted_points: 5.5,
            minutes_exp: 90,
            opponent: 'ARS',
            is_home: false,
            opp_strength: 3.8,
            price: 5.5
        },
        {
            player_id: 5,
            name: 'Defender Three',
            team: 'CHE',
            pos: 'DEF',
            predicted_points: 5.0,
            minutes_exp: 90,
            opponent: 'MCI',
            is_home: false,
            opp_strength: 4.0,
            price: 5.0
        },
        {
            player_id: 6,
            name: 'Defender Four',
            team: 'ARS',
            pos: 'DEF',
            predicted_points: 4.8,
            minutes_exp: 90,
            opponent: 'LIV',
            is_home: true,
            opp_strength: 3.9,
            price: 5.5
        },
        // Midfielders
        {
            player_id: 7,
            name: 'Midfielder One',
            team: 'MCI',
            pos: 'MID',
            predicted_points: 8.0,
            minutes_exp: 90,
            opponent: 'CHE',
            is_home: true,
            opp_strength: 3.5,
            price: 10.0
        },
        {
            player_id: 8,
            name: 'Midfielder Two',
            team: 'LIV',
            pos: 'MID',
            predicted_points: 7.5,
            minutes_exp: 90,
            opponent: 'ARS',
            is_home: false,
            opp_strength: 3.8,
            price: 9.5
        },
        {
            player_id: 9,
            name: 'Midfielder Three',
            team: 'CHE',
            pos: 'MID',
            predicted_points: 6.5,
            minutes_exp: 85,
            opponent: 'MCI',
            is_home: false,
            opp_strength: 4.0,
            price: 8.0
        },
        {
            player_id: 10,
            name: 'Midfielder Four',
            team: 'ARS',
            pos: 'MID',
            predicted_points: 6.0,
            minutes_exp: 80,
            opponent: 'LIV',
            is_home: true,
            opp_strength: 3.9,
            price: 7.5
        },
        // Forwards
        {
            player_id: 11,
            name: 'Forward One',
            team: 'MCI',
            pos: 'FWD',
            predicted_points: 10.0,
            minutes_exp: 90,
            opponent: 'CHE',
            is_home: true,
            opp_strength: 3.5,
            price: 12.0
        },
        {
            player_id: 12,
            name: 'Forward Two',
            team: 'LIV',
            pos: 'FWD',
            predicted_points: 9.0,
            minutes_exp: 90,
            opponent: 'ARS',
            is_home: false,
            opp_strength: 3.8,
            price: 11.0
        },
        {
            player_id: 13,
            name: 'Forward Three',
            team: 'CHE',
            pos: 'FWD',
            predicted_points: 7.0,
            minutes_exp: 85,
            opponent: 'MCI',
            is_home: false,
            opp_strength: 4.0,
            price: 9.0
        },
        // Bench players
        {
            player_id: 14,
            name: 'Bench Defender',
            team: 'TOT',
            pos: 'DEF',
            predicted_points: 4.0,
            minutes_exp: 70,
            opponent: 'WHU',
            is_home: true,
            opp_strength: 3.0,
            price: 4.5
        },
        {
            player_id: 15,
            name: 'Bench Mid',
            team: 'TOT',
            pos: 'MID',
            predicted_points: 3.5,
            minutes_exp: 60,
            opponent: 'WHU',
            is_home: true,
            opp_strength: 3.0,
            price: 4.5
        },
        {
            player_id: 16,
            name: 'Bench Forward',
            team: 'TOT',
            pos: 'FWD',
            predicted_points: 3.0,
            minutes_exp: 50,
            opponent: 'WHU',
            is_home: true,
            opp_strength: 3.0,
            price: 4.5
        }
    ]

    describe('Valid lineup (1 GK in XI)', () => {
        test('returns ok=true with no issues', () => {
            const validLineup: LineupPayload = {
                season: '2024-25',
                gw: 1,
                generated_at: '2024-08-01T12:00:00Z',
                model_version: 'test_v1',
                formation: '4-4-2',
                xi_ids: [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // 1 GK + 4 DEF + 4 MID + 2 FWD
                bench_gk_id: 2,
                bench_out_ids: [13, 14, 15],
                captain_id: 11,
                vice_id: 7,
                xi_points_sum: 72.3
            }

            const result = validateLineup(validLineup, mockPlayers)

            expect(result.ok).toBe(true)
            expect(result.issues).toHaveLength(0)
        })
    })

    describe('Invalid lineup (2 GKs in XI)', () => {
        test('returns ok=false with issues about GK count', () => {
            const invalidLineup: LineupPayload = {
                season: '2024-25',
                gw: 1,
                generated_at: '2024-08-01T12:00:00Z',
                model_version: 'test_v1',
                formation: '4-4-2',
                xi_ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // 2 GKs! (IDs 1 and 2)
                bench_gk_id: 13,
                bench_out_ids: [12, 14, 15],
                captain_id: 11,
                vice_id: 7,
                xi_points_sum: 72.3
            }

            const result = validateLineup(invalidLineup, mockPlayers)

            expect(result.ok).toBe(false)
            expect(result.issues.length).toBeGreaterThanOrEqual(1)

            // Check that the issue mentions GK count
            const gkIssue = result.issues.find(issue => issue.includes('GK'))
            expect(gkIssue).toBeDefined()
            expect(gkIssue).toContain('2') // Should mention finding 2 GKs
        })
    })

    describe('Invalid lineup (0 GKs in XI)', () => {
        test('returns ok=false with issues about missing GK', () => {
            const invalidLineup: LineupPayload = {
                season: '2024-25',
                gw: 1,
                generated_at: '2024-08-01T12:00:00Z',
                model_version: 'test_v1',
                formation: '4-4-2',
                xi_ids: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], // No GK!
                bench_gk_id: 1,
                bench_out_ids: [2, 14, 15],
                captain_id: 11,
                vice_id: 7,
                xi_points_sum: 72.3
            }

            const result = validateLineup(invalidLineup, mockPlayers)

            expect(result.ok).toBe(false)
            expect(result.issues.length).toBeGreaterThanOrEqual(1)

            const gkIssue = result.issues.find(issue => issue.includes('GK'))
            expect(gkIssue).toBeDefined()
            expect(gkIssue).toContain('0') // Should mention finding 0 GKs
        })
    })

    describe('Other validation failures', () => {
        test('invalid formation string', () => {
            const invalidLineup: LineupPayload = {
                season: '2024-25',
                gw: 1,
                generated_at: '2024-08-01T12:00:00Z',
                model_version: 'test_v1',
                formation: '10-0-0' as any, // Invalid formation
                xi_ids: [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                bench_gk_id: 2,
                bench_out_ids: [13, 14, 15],
                captain_id: 11,
                vice_id: 7,
                xi_points_sum: 72.3
            }

            const result = validateLineup(invalidLineup, mockPlayers)

            expect(result.ok).toBe(false)
            expect(result.issues.some(issue => issue.includes('formation'))).toBe(true)
        })

        test('wrong number of XI players', () => {
            const invalidLineup: LineupPayload = {
                season: '2024-25',
                gw: 1,
                generated_at: '2024-08-01T12:00:00Z',
                model_version: 'test_v1',
                formation: '4-4-2',
                xi_ids: [1, 3, 4, 5, 6, 7, 8, 9, 10], // Only 9 players
                bench_gk_id: 2,
                bench_out_ids: [11, 12, 13],
                captain_id: 7,
                vice_id: 3,
                xi_points_sum: 60.0
            }

            const result = validateLineup(invalidLineup, mockPlayers)

            expect(result.ok).toBe(false)
            expect(result.issues.some(issue => issue.includes('11 players'))).toBe(true)
        })

        test('bench GK in starting XI', () => {
            const invalidLineup: LineupPayload = {
                season: '2024-25',
                gw: 1,
                generated_at: '2024-08-01T12:00:00Z',
                model_version: 'test_v1',
                formation: '4-4-2',
                xi_ids: [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                bench_gk_id: 1, // Same as in XI!
                bench_out_ids: [2, 13, 14],
                captain_id: 11,
                vice_id: 7,
                xi_points_sum: 72.3
            }

            const result = validateLineup(invalidLineup, mockPlayers)

            expect(result.ok).toBe(false)
            expect(result.issues.some(issue => issue.includes('Bench GK'))).toBe(true)
        })

        test('captain and vice are the same', () => {
            const invalidLineup: LineupPayload = {
                season: '2024-25',
                gw: 1,
                generated_at: '2024-08-01T12:00:00Z',
                model_version: 'test_v1',
                formation: '4-4-2',
                xi_ids: [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                bench_gk_id: 2,
                bench_out_ids: [13, 14, 15],
                captain_id: 11,
                vice_id: 11, // Same as captain!
                xi_points_sum: 72.3
            }

            const result = validateLineup(invalidLineup, mockPlayers)

            expect(result.ok).toBe(false)
            expect(result.issues.some(issue => issue.includes('different'))).toBe(true)
        })
    })
})
