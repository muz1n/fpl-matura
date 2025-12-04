/**
 * Utility functions für FPL Player Images
 */

/**
 * Generiert die offizielle FPL Photo URL
 * Format: https://resources.premierleague.com/premierleague/photos/players/250x250/p{code}.png
 */
export function getFplPhotoUrl(photoCode: number | string | null | undefined): string | null {
    if (!photoCode) return null
    const code = typeof photoCode === 'string' ? parseInt(photoCode, 10) : photoCode
    if (isNaN(code)) return null
    return `https://resources.premierleague.com/premierleague/photos/players/250x250/p${code}.png`
}

/**
 * Erstellt einen Fallback SVG Placeholder mit Initialen
 */
export function getPlayerPlaceholderSvg(name: string): string {
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250">
        <rect width="250" height="250" fill="#1e293b"/>
        <text x="125" y="125" dominant-baseline="middle" text-anchor="middle" fill="#e2e8f0" 
              font-family="system-ui, -apple-system, sans-serif" font-size="72" font-weight="700">
            ${initials}
        </text>
    </svg>`

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

/**
 * Gibt die beste verfügbare Bild-URL zurück
 * Priority: 1) FPL Photo URL 2) Provided URL 3) SVG Placeholder
 */
export function getPlayerImageUrl(
    photoCode: number | null | undefined,
    providedUrl: string | null | undefined,
    playerName: string
): string {
    // 1. Try FPL official photo
    const fplUrl = getFplPhotoUrl(photoCode)
    if (fplUrl) return fplUrl

    // 2. Try provided URL
    if (providedUrl) return providedUrl

    // 3. Fallback to SVG placeholder
    return getPlayerPlaceholderSvg(playerName)
}
