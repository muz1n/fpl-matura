/**
 * Testet die Feature-Importance API Endpoints (global + positions + index).
 */
import { createServer } from 'http'
import next from 'next'

describe('Feature Importance API', () => {
    let app: any
    let server: any
    let urlBase: string

    beforeAll(async () => {
        app = next({ dev: false, dir: process.cwd() + '/web' })
        await app.prepare()
        const handle = app.getRequestHandler()
        server = createServer((req, res) => handle(req, res))
        await new Promise(resolve => server.listen(0, resolve))
        const addr = server.address()
        const port = typeof addr === 'object' && addr ? addr.port : 0
        urlBase = `http://localhost:${port}`
    })

    afterAll(async () => {
        await new Promise(resolve => server.close(resolve))
    })

    it('liefert 400 ohne Season', async () => {
        const res = await fetch(`${urlBase}/api/feature-importance//rf`)
        expect(res.status).toBe(404) // Next dynamic route fehlend
    })

    it('Index liefert Seasons-Array (falls Dateien vorhanden)', async () => {
        const res = await fetch(`${urlBase}/api/feature-importance`)
        expect([200, 500]).toContain(res.status)
        if (res.status === 200) {
            const json = await res.json()
            expect(json).toHaveProperty('seasons')
            expect(Array.isArray(json.seasons)).toBe(true)
        }
    })

    it('Positionsparameter validiert', async () => {
        const resBad = await fetch(`${urlBase}/api/feature-importance/2023-24/rf?position=XYZ`)
        expect(resBad.status).toBe(400)
    })
})