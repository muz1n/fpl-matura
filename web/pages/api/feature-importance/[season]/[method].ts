import type { NextApiRequest, NextApiResponse } from 'next'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const OUT_DIR = process.env.FPL_OUT_DIR || join(process.cwd(), '..', 'out')

interface FeatureImportanceRow {
  feature: string
  importance: number
  rank: number
  cumulative: number
  normalized: number
}

interface FeatureImportanceResponse {
  season: string
  method: string
  n_features: number
  generated_at: string
  features: FeatureImportanceRow[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { season, method } = req.query
    if (!season || typeof season !== 'string') {
      return res.status(400).json({ error: 'Season parameter required' })
    }
    if (!method || typeof method !== 'string') {
      return res.status(400).json({ error: 'Method parameter required' })
    }

    // Aktuell nur rf implementiert
    if (method !== 'rf') {
      return res.status(400).json({ error: 'Nur rf unterstützt (Random Forest)' })
    }

    const fileName = `feature_importance_${season}_${method}.json`
    const filePath = join(OUT_DIR, fileName)

    let raw: string
    try {
      raw = await readFile(filePath, 'utf8')
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        return res.status(404).json({
          error: 'Keine Feature Importance Datei gefunden',
          suggestion: `Erzeuge zuerst die Datei mit: python code/compute_feature_importance.py --season ${season}`,
          expected_file: fileName
        })
      }
      throw e
    }

    let parsed: FeatureImportanceResponse
    try {
      parsed = JSON.parse(raw)
    } catch {
      return res.status(422).json({ error: 'Ungültiges JSON Format in Importance Datei' })
    }

    return res.status(200).json(parsed)
  } catch (err: any) {
    console.error('Feature Importance API Fehler:', err)
    return res.status(500).json({ error: err?.message ?? 'Interner Fehler' })
  }
}
