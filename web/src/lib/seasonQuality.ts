/**
 * Hilfsfunktionen fuer Season Quality Daten
 * 
 * Enthaelt Informationen ueber die Nutzbarkeit verschiedener FPL-Seasons
 */

interface SeasonQuality {
  usable: boolean
  reason?: string
  details?: {
    total_rows?: number
    missing_position_data?: number
    duplicate_rows_removed?: number
    low_player_count_gws?: number[]
    notes?: string
  }
}

interface SeasonQualityData {
  _meta: {
    description: string
    last_updated: string
    data_source: string
  }
  seasons: {
    [key: string]: SeasonQuality
  }
}

const typedData: SeasonQualityData = {
  _meta: {
    description: "Datenqualitaet und Nutzbarkeit pro FPL-Season",
    last_updated: "2025-11-18",
    data_source: "vaastav/Fantasy-Premier-League (GitHub)"
  },
  seasons: {
    "2016-17": { usable: false, reason: "Fehlende Position-Daten" },
    "2017-18": { usable: false, reason: "Fehlende Position-Daten" },
    "2018-19": { usable: false, reason: "Fehlende Position-Daten" },
    "2019-20": { usable: false, reason: "Fehlende Position-Daten" },
    "2020-21": { usable: true, reason: "Vollstaendige Daten verfuegbar" },
    "2021-22": { usable: true, reason: "Vollstaendige Daten verfuegbar" },
    "2022-23": { usable: true, reason: "Vollstaendige Daten verfuegbar" },
    "2023-24": { usable: true, reason: "Vollstaendige Daten verfuegbar" }
  }
}

export function getUsableSeasons(): string[] {
  return Object.entries(typedData.seasons)
    .filter(([_, quality]) => quality.usable)
    .map(([season, _]) => season)
    .sort()
}

export function isSeasonUsable(season: string): boolean {
  return typedData.seasons[season]?.usable ?? false
}

export function getSeasonQuality(season: string): SeasonQuality | undefined {
  return typedData.seasons[season]
}

export function getAllSeasons(): string[] {
  return Object.keys(typedData.seasons).sort()
}
