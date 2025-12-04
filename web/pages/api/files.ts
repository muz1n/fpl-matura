import { NextApiRequest, NextApiResponse } from 'next';
import { join } from 'path';
import { createReadStream, existsSync, statSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'public', 'data');
const BACKTEST_DIR = join(DATA_DIR, 'backtests');

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

    // Zuerst im backtests/ Unterordner suchen, dann im root
    let filePath = join(BACKTEST_DIR, name);
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        // Fallback: Root-Verzeichnis
        filePath = join(DATA_DIR, name);
        if (!existsSync(filePath) || !statSync(filePath).isFile()) {
            return res.status(404).json({ error: 'file not found' });
        }
    }

    res.setHeader('Content-Type', getMimeType(name));
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    const stream = createReadStream(filePath);
    stream.pipe(res);
}