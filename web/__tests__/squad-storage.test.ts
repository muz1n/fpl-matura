import { saveSquad, loadSquad, clearSquad } from '../src/lib/squad-storage'

// LocalStorage Polyfill für Jest (falls nicht vorhanden)
const local: Record<string, string> = {}
beforeAll(() => {
    // @ts-ignore
    global.localStorage = {
        getItem: (k: string) => (k in local ? local[k] : null),
        setItem: (k: string, v: string) => { local[k] = v },
        removeItem: (k: string) => { delete local[k] },
        clear: () => { Object.keys(local).forEach(k => delete local[k]) },
    }
})

describe('squad-storage', () => {
    afterEach(() => {
        clearSquad()
    })

    test('speichern und laden', () => {
        const ok = saveSquad([1, 2, 3])
        expect(ok).toBe(true)
        const loaded = loadSquad()
        expect(loaded).not.toBeNull()
        expect(loaded?.ids).toEqual([1, 2, 3])
    })

    test('ungueltig (zu viele)', () => {
        const ok = saveSquad(Array.from({ length: 20 }, (_, i) => i + 1))
        expect(ok).toBe(false)
        expect(loadSquad()).toBeNull()
    })

    test('clear entfernt daten', () => {
        saveSquad([5, 6, 7])
        clearSquad()
        expect(loadSquad()).toBeNull()
    })
})
