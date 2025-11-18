/**
 * API-Endpoint für historische Lineup-Evaluation
 * 
 * GET /api/eval/[season]/[gw]?methode=rf
 * 
 * Vergleicht generiertes Modell-Lineup mit optimal möglichem Lineup
 * (basierend auf tatsächlichen Punkten für historische Gameweeks).
 * 
 * Nur für Seasons 2020-21 bis 2023-24 verfügbar (Datenqualität).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const PROJECT_ROOT = join(process.cwd(), '..');
const PYTHON_SCRIPT = join(PROJECT_ROOT, 'code', 'evaluate_lineup.py');

interface EvaluationResponse {
    evaluation_possible: boolean;
    error_message?: string;
    season?: string;
    gw?: number;
    methode?: string;
    model_lineup?: Record<string, unknown>;
    model_actual_points?: number;
    optimal_lineup?: Record<string, unknown>;
    optimal_points?: number;
    delta?: number;
    efficiency_percent?: number;
}

/**
 * Ruft Python-Script auf um Lineup zu evaluieren
 */
async function evaluateLineup(
    season: string,
    gw: number,
    methode: string = 'rf'
): Promise<EvaluationResponse> {
    return new Promise((resolve, reject) => {
        // Rufe Python-Funktion direkt auf
        const pythonCode = `
import sys
sys.path.insert(0, '${PROJECT_ROOT.replace(/\\/g, '\\\\')}')
from code.evaluate_lineup import evaluate_single_lineup_for_webapp
import json

result = evaluate_single_lineup_for_webapp('${season}', ${gw}, '${methode}')
print(json.dumps(result, ensure_ascii=False))
`;

        const python = spawn('python', ['-c', pythonCode], {
            cwd: PROJECT_ROOT,
        });

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        python.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python exited with code ${code}: ${stderr}`));
                return;
            }

            try {
                const result = JSON.parse(stdout);
                resolve(result);
            } catch (e) {
                reject(new Error(`Failed to parse Python output: ${stdout}\n${stderr}`));
            }
        });

        python.on('error', (error) => {
            reject(new Error(`Failed to spawn Python: ${error.message}`));
        });
    });
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<EvaluationResponse>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({
            evaluation_possible: false,
            error_message: 'Method not allowed',
        });
    }

    try {
        const { season, gw, methode = 'rf' } = req.query;

        // Validiere Parameter
        if (!season || typeof season !== 'string') {
            return res.status(400).json({
                evaluation_possible: false,
                error_message: 'Season parameter erforderlich (z.B. "2021-22")',
            });
        }

        if (!gw || typeof gw !== 'string') {
            return res.status(400).json({
                evaluation_possible: false,
                error_message: 'GW parameter erforderlich (z.B. "25")',
            });
        }

        const gwNum = parseInt(gw, 10);
        if (isNaN(gwNum) || gwNum < 1 || gwNum > 38) {
            return res.status(400).json({
                evaluation_possible: false,
                error_message: 'GW muss zwischen 1 und 38 liegen',
            });
        }

        const methodeStr = typeof methode === 'string' ? methode : 'rf';

        // Rufe Python-Evaluation auf
        const result = await evaluateLineup(season, gwNum, methodeStr);

        // HTTP-Status basierend auf evaluation_possible
        if (!result.evaluation_possible) {
            return res.status(422).json(result);
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error('Error in eval API:', error);
        return res.status(500).json({
            evaluation_possible: false,
            error_message: error instanceof Error ? error.message : 'Unbekannter Fehler',
        });
    }
}
