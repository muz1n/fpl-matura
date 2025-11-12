# Vorbereitung FPL API Integration (Platzhalter)

Dieser Code legt die Struktur für eine zukünftige Anbindung an die offizielle Fantasy Premier League API an – **ohne** aktuell echte Requests oder Logins auszuführen.

## Komponenten / Module

| Modul | Zweck |
|-------|-------|
| `src/server/cache.ts` | Einfache In-Memory TTL Cache (später austauschbar gegen Redis o.ä.). |
| `src/server/rateLimit.ts` | Minimaler Token-Bucket Rate-Limiter zum Schutz gegen Überlastung. |
| `src/server/fpl/client.ts` | Platzhalter für FPL-Client Funktionen (`getCurrentGameweek`, `getTeamById`), aktuell Stub. |
| `pages/api/fpl/current-gw.ts` | API Endpoint, liefert Stub oder (später) Live-Gameweek-Daten. Rate-Limit integriert. |

## Environment Flag

Die Variable `FPL_API_ENABLED` steuert, ob echte externe Requests gemacht werden. Standard: nicht gesetzt / `false` → Stub-Modus.

```env
FPL_API_ENABLED=false
```

Wird sie auf `true` gesetzt, kann im Client später der auskommentierte Fetch aktiviert werden (User-Agent hinzufügen, Fehler behandeln, Caching nutzen).

## Ablauf (geplant)
1. `getCurrentGameweek()` prüft Cache → optional Fetch bootstrap-static → extrahiert aktuelle oder nächste GW.  
2. Team-Endpunkte (`getTeamById`) werden ähnlich gecacht (Rate-Limit beachten).  
3. UI kann Team-ID (lokal) speichern; bei Aktivierung der API könnte `/api/fpl/team?teamId=...` hinzugefügt werden (noch nicht implementiert).  

## Sicherheit & Datenschutz
Aktuell keine Authentifizierung, keine Cookies, keine Weitergabe von Secret Keys. Später: falls Login nötig, nur serverseitig und niemals Plain-Credentials im Client speichern.

## Erweiterungen (Next Steps)
* Persistenter Cache (Redis / KV) statt In-Memory.
* Error-Klassen für besseres Fehler-Handling (429 / 5xx differenzieren).
* Team-Endpunkt `/api/fpl/team` mit Normalisierung relevanter Felder.
* Metriken / Logging (z.B. Anzahl Rate-Limit-Hits).

## warum jetzt?
Die Struktur erlaubt frühes UI-Wiring ohne Risiko: Stub-Daten geben Form, API kann später “einfach” eingeschaltet werden.

---
© 2025 FPL Assistent – Vorbereitung ohne echte FPL API Nutzung.
