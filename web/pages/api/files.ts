import { NextApiRequest, NextApiResponse } from 'next';
import { join } from 'path';
import { createReadStream, existsSync, statSync } from 'fs';

const OUT_DIR = process.env.FPL_OUT_DIR || join(process.cwd(), '..', 'out');

const MIME_MAP: Record<string, string> = {
    '.csv': 'text/csv',
    '.png': 'image/png',
    '.json': 'application/json',
};

function getMimeType(filename: string): string {
    const ext = filename.slice(filename.lastIndexOf('.'));
    return MIME_MAP[ext] || 'application/octet-stream';
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const name = req.query.name;
    if (typeof name !== 'string' || name.includes('/') || name.includes('\\') || name.includes('..')) {
        return res.status(400).json({ error: 'invalid filename' });
    }
    const filePath = join(OUT_DIR, name);
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        return res.status(404).json({ error: 'file not found' });
    }
    res.setHeader('Content-Type', getMimeType(name));
    const stream = createReadStream(filePath);
    stream.pipe(res);
}