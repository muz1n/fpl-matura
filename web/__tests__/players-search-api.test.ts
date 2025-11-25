import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/players/search'

type ResShape = { status: number; json: any }

function mockRes(): { res: Partial<NextApiResponse>; out: Promise<ResShape> } {
    let resolve: (v: ResShape) => void
    const out = new Promise<ResShape>(r => (resolve = r))
    const res: Partial<NextApiResponse> = {
        status(code: number) {
            return {
                json(payload: any) {
                    resolve({ status: code, json: payload })
                    return undefined as any
                },
            } as any
        },
    }
    // @ts-ignore
    return { res, out }
}

describe('API /api/players/search', () => {
    test('400 on missing params', async () => {
        const req = { method: 'GET', query: {}, headers: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
        const { res, out } = mockRes()
        // @ts-ignore
        await handler(req, res)
        const r = await out
        expect(r.status).toBe(400)
    })

    test('returns results for known season', async () => {
        const req = { method: 'GET', query: { season: '2023-24', q: 'salah' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as NextApiRequest
        const { res, out } = mockRes()
        // @ts-ignore
        await handler(req, res)
        const r = await out
        expect(r.status).toBe(200)
        expect(Array.isArray(r.json.results)).toBe(true)
        // Should find at least one matching player
        expect(r.json.results.length).toBeGreaterThan(0)
    })
})
