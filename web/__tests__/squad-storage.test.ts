import { saveSquad, loadSquad, clearSquad, formatSquadSummary } from '../lib/squad-storage'
import type { StoredSquad } from '../lib/squad-storage'

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value
        },
        removeItem: (key: string) => {
            delete store[key]
        },
        clear: () => {
            store = {}
        }
    }
})()

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
})

describe('squad-storage', () => {
    beforeEach(() => {
        localStorageMock.clear()
    })

    const validSquad: StoredSquad = {
        gw: 38,
        formation: '4-3-3',
        xi_ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        bench_gk_id: 12,
        bench_out_ids: [13, 14, 15],
        captain_id: 1,
        vice_id: 2
    }

    test('saveSquad speichert Daten korrekt', () => {
        saveSquad(validSquad)
        const stored = localStorageMock.getItem('lastSquad')
        expect(stored).toBeTruthy()
        const parsed = JSON.parse(stored!)
        expect(parsed.gw).toBe(38)
        expect(parsed.formation).toBe('4-3-3')
    })

    test('loadSquad lädt gespeicherte Daten', () => {
        saveSquad(validSquad)
        const loaded = loadSquad()
        expect(loaded).toEqual(validSquad)
    })

    test('loadSquad gibt null zurück wenn keine Daten vorhanden', () => {
        const loaded = loadSquad()
        expect(loaded).toBeNull()
    })

    test('loadSquad validiert Daten mit Zod', () => {
        // Ungültige Daten speichern
        localStorageMock.setItem('lastSquad', JSON.stringify({ gw: 'invalid' }))
        const loaded = loadSquad()
        expect(loaded).toBeNull()
    })

    test('loadSquad prüft GW-Range', () => {
        const invalidSquad = { ...validSquad, gw: 50 }
        localStorageMock.setItem('lastSquad', JSON.stringify(invalidSquad))
        const loaded = loadSquad()
        expect(loaded).toBeNull()
    })

    test('loadSquad prüft XI-Länge', () => {
        const invalidSquad = { ...validSquad, xi_ids: [1, 2, 3] }
        localStorageMock.setItem('lastSquad', JSON.stringify(invalidSquad))
        const loaded = loadSquad()
        expect(loaded).toBeNull()
    })

    test('clearSquad entfernt Daten', () => {
        saveSquad(validSquad)
        clearSquad()
        const loaded = loadSquad()
        expect(loaded).toBeNull()
    })

    test('formatSquadSummary formatiert korrekt', () => {
        const summary = formatSquadSummary(validSquad)
        expect(summary).toContain('GW 38')
        expect(summary).toContain('4-3-3')
        expect(summary).toContain('11 Spieler')
    })
})
