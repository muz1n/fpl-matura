#let daten_und_features() = [
= Daten und Features

== Ziel dieses Kapitels
Ich erkläre, woher meine Daten kommen, wie sie zeitlich abgedeckt sind, wie eine einzelne Beobachtung aussieht, welche Spalten wichtig sind und welche *Features* (abgeleiteten Eingaben) ich bilde. Das Kapitel ist so geschrieben, dass ein Laie versteht, *was* später ins Modell eingeht und *warum*.

== Quellen und Zeitraum
Ich verwende öffentlich zugängliche FPL-Daten und historische Sammlungen. Mein Fokus liegt auf Spielerdaten pro Gameweek. Wichtige Punkte:
- *Quelle*: Offene FPL-Daten (historisch) und eigene Aufbereitung im Repo.  
- *Einheit*: Eine Beobachtung ist „ein Spieler in einer bestimmten Gameweek“.  
- *Zeitraum*: Ich dokumentiere für jeden Datensatz den genauen Zeitraum im Datenteil meines Repos (Dateinamen und Ordner).  
- *Transparenz*: Jede Datei hat einen klaren Speicherort und kann von aussen nachvollzogen werden.

Hinweis: Exakte Dateipfade und Zeiträume ergänze ich im Laufe der Arbeit direkt hier, sobald alle Roh- und Zwischenstände final benannt sind.

== Beobachtungsebene und IDs
Ich arbeite auf der Ebene *Spieler × Gameweek*. Das heisst:
- *Primärschlüssel (ID)*: eine stabile Spieler-ID plus die Gameweek-Nummer.  
- *Beispiel*: `(spieler_id=1234, gw=12)` identifiziert genau einen Datensatz.

Diese klare ID-Logik ist wichtig, damit beim Zusammenführen aus verschiedenen Quellen keine Dubletten oder Verschiebungen entstehen.

== Datensatz im Überblick (Beispielstruktur)
Zur Orientierung zeige ich eine *vereinfachte* Tabelle mit typischen Spalten. Die echten Spaltennamen und Beispiele ergänze ich im nächsten Commit mit meinem aktuellen Export.

| spieler_id | gw | name        | pos | team | gegner | heim | minuten | tore | assists | gegentore | gelb | rot | bonus | punkte |
| 101        | 12 | M. Example  | DEF | ARS  | MCI    | 1    | 78      | 0    | 1       | 1         | 0    | 0   | 2     | 6      |
| 205        | 12 | J. Sample   | MID | LIV  | EVE    | 0    | 90      | 1    | 0       | 0         | 1    | 0   | 1     | 8      |
| 330        | 12 | A. Player   | FWD | CHE  | TOT    | 1    | 63      | 0    | 0       | 2         | 0    | 0   | 0     | 2      |

*Erläuterungen (laienklar):*
- *pos*: Position (GK, DEF, MID, FWD). Position beeinflusst die Punktevergabe.
- *heim*: 1 = Heimspiel, 0 = Auswärtsspiel. Heimvorteil kann eine Rolle spielen.
- *minuten*: Einsatzzeit. Ohne Einsatzzeit kann ein Spieler kaum punkten.
- *tore/assists/gegentore*: direkte Ereignisse mit starkem Einfluss auf Punkte.
- *bonus*: Zusatzpunkte in FPL für gute Gesamtleistung im Spiel.
- *punkte*: Zielwert der Arbeit, den ich für die nächste Gameweek schätzen möchte.

== Warum ich Features bilde
Rohwerte sind wichtig, aber oft schwankend. *Features* glätten oder verdichten Informationen, damit das Modell stabilere Muster lernt. Ich bilde Features nur, wenn sie
1) *verständlich* sind,
2) einen *klaren Bezug* zur Leistung haben und
3) *keine Zukunftsinformation* verwenden (keine „Leaks“).

== Feature-Katalog (nach Gruppen, jeweils 1 Satz Zweck)
*Einsatz & Verlässlichkeit*
- *mins_ma3*: Durchschnittliche Minuten der letzten 3 Spiele. Zweck: zeigt, ob ein Spieler regelmässig und lange spielt.
- *starts_ma3*: Anteil Startelfeinsätze in den letzten 3 Spielen. Zweck: höhere Startwahrscheinlichkeit.
- *dnp_rate_ma5*: Anteil „Did-Not-Play“ in den letzten 5 Spielen. Zweck: Rotations-/Verletzungsrisiko sichtbar machen.

*Offensive Wirkung*
- *shots_ma3*: Schüsse pro Spiel (Ø der letzten 3). Zweck: zeigt Abschlussaktivität.
- *xg_ma3*: Erwartete Tore (Ø der letzten 3). Zweck: bessere Chance auf künftige Tore als nur der Torzähler.
- *xa_ma3*: Erwartete Assists (Ø der letzten 3). Zweck: Vorlagengefahr messbar machen.

*Defensive/Team-Kontext*
- *team_cs_rate_ma5*: Clean-Sheet-Rate des Teams in den letzten 5 Spielen. Zweck: Verteidiger/Torhüter profitieren von zu Null.
- *opp_goals_scored_ma5*: Durchschnitt erzielter Tore des Gegners in den letzten 5. Zweck: Gegneroffensive als Risikoindikator.
- *was_home*: Heimspiel (1) vs. Auswärts (0). Zweck: Heimvorteil abbilden.

*Form und Trend*
- *points_ma3*: Ø Punkte der letzten 3 Spiele. Zweck: einfache Formkennzahl.
- *points_momentum*: Punkte der letzten 3 Spiele gewichtet (jüngere Spiele zählen mehr). Zweck: frische Form stärker betonen.

*Preis/Ownership (falls verfügbar)*
- *value_now*: aktueller FPL-Preis. Zweck: Markt spiegelt oft Form/Erwartung wider.
- *selected_by_pct*: Anteil Manager, die den Spieler gewählt haben. Zweck: weiche Wisdom-of-Crowds-Info.

*Hinweis:* Die *genauen* Spaltennamen übernehme ich 1:1 aus meinem Datensatz. Wo meine echten Namen abweichen, passe ich die Liste an, damit Dokumentation und Code exakt übereinstimmen.

== Leckagen vermeiden (wichtig und laienklar)
Eine *Leckage* liegt vor, wenn ich Informationen benutze, die zum Entscheidzeitpunkt *noch gar nicht bekannt* waren. Beispiele:
- Ein Feature nutzt bereits die Punkte *der Zukunft* (zum Beispiel den Durchschnitt inklusive der Gameweek, die ich vorhersagen will).
- Ein Gegnerstärke-Wert wird aus einem Spiel berechnet, das nach dem Vorhersagezeitpunkt liegt.

*Regel:* Features dürfen nur Informationen nutzen, die *vor* der vorhergesagten Gameweek bekannt waren. Ich teste das, indem ich Zeitfenster klar trenne und Roll-Fenster verwende, die nur in die Vergangenheit schauen.

== Umgang mit fehlenden Werten
- *Echte Null vs. fehlt*: 0 Tore ist ein gültiger Wert. „Fehlt“ bedeutet „es gibt keine Angabe“. Ich unterscheide das klar.
- *Imputation*: Wenn ein Wert fehlt, fülle ich ihn sparsam, zum Beispiel mit einem kleinen neutralen Wert oder lass ihn leer, wenn das Modell damit umgehen kann.
- *Dokumentation*: Jede Imputation wird kurz begründet, damit Leser wissen, warum diese Wahl sinnvoll ist.

== Skalierung und Binning (kurz)
Random-Forest-Modelle brauchen keine Merkmals-Skalierung. Wenn Binning sinnvoll ist (z. B. Minuten in Kategorien), begründe ich das kurz mit Lesbarkeit oder Stabilität.

== IDs und Joins (einfach, aber wichtig)
Wenn ich Datenquellen zusammenführe, gilt:
- Join-Schlüssel sind *spieler_id* und *gw* (plus Team/Datum, wenn nötig).
- Nach dem Join prüfe ich, ob die Zeilenzahl *gleich* blieb und ob es Duplikate gab.
- Ich dokumentiere diese Prüfung im Journal, damit man sieht, dass nichts verrutscht ist.

== Datenqualität und bekannte Grenzen
- *Abdeckung*: Nicht alle Spiele haben denselben Detailgrad. Ich vermerke Lücken transparent.
- *Aktualität*: Historische Daten bilden nicht alle Regeländerungen ab. Ich erkläre das in den Grundlagen der FPL-Regeln.
- *Rauschen*: Einzelspiele haben Zufall. Darum nutze ich rollende Durchschnitte statt Einzelzahlen.

== Reproduzierbarkeit (Pfad-Hinweise)
- *Ablage*: Rohdaten unter `data/…`, aufbereitete Zwischenschritte unter `data/processed/…`, generierte Features unter `data/features/…`.  
- *Output*: Tabellen und Plots unter `out/…` mit sprechenden Dateinamen.  
- *Namenskonvention*: Dateien enthalten Saison und Typ (z. B. `merged_gw_2023-24.csv`).  
- *Schritte*: Ich dokumentiere in meinem Journal, wie ich von Rohdaten zu Feature-Tabellen kam (Skriptnamen, Aufruf, Datum).

== Was ein Laie nach diesem Kapitel sicher versteht
- Was eine Beobachtung ist (Spieler × Gameweek) und wozu IDs dienen.
- Welche Spalten typisch sind und was sie bedeuten.
- Was ein *Feature* ist und warum ich es bilde.
- Wie man zukünftige Informationen sicher *nicht* benutzt (Leckagen vermeiden).
- Wie mit fehlenden Werten umgegangen wird.
- Wo im Projekt die Daten liegen und wie man Arbeitsschritte nachvollzieht.
]
