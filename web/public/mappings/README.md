# Mappings für Bilder (optional)

Diese Dateien sind optional und erweitern die API `/api/players/search` um echte Bilder:

- `public/mappings/team_codes_by_season.json`
  - Struktur:
  ```json
  {
    "2020-21": { "Manchester City": 43, "Chelsea": 8 },
    "2023-24": { "Arsenal": 3 }
  }
  ```
  - Generiert Club-Wappen URLs: `https://resources.premierleague.com/premierleague/badges/70/t{code}.png`

- `public/mappings/player_photo_codes/<season>.json`
  - Beispiel: `public/mappings/player_photo_codes/2020-21.json`
  - Struktur:
  ```json
  {
    "Kevin De Bruyne": 61366,
    "Erling Haaland": 195851
  }
  ```
  - Generiert Spielerbilder: `https://resources.premierleague.com/premierleague/photos/players/250x250/p{code}.png`

Falls diese Dateien fehlen, liefert die API automatisch lesbare SVG-Platzhalter (Initialen).
