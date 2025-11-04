#let reproduzierbarkeit() = [
= Reproduzierbarkeit und Projektstruktur

== Wozu dieses Kapitel dient
Ich zeige, wie meine Arbeit von aussen nachgebaut werden kann. Dazu erkläre ich, wo welche Dateien liegen, wie man die Umgebung einrichtet, wie man Läufe startet, wo Ergebnisse erscheinen und wie ich alles dokumentiere. Ziel: Jemand ohne Vorwissen kann meine Schritte nachvollziehen und die wichtigen Ergebnisse selbst erzeugen.

== Was Reproduzierbarkeit hier bedeutet
- Gleiche Eingaben führen auf anderer Hardware zu gleichen Ergebnissen (innerhalb normaler Toleranzen).
- Alle Schritte sind beschrieben: Datenquelle, Aufbereitung, Feature-Bildung, Training, Test, Ausgaben.
- Jede wichtige Zahl im Text hat einen nachvollziehbaren Ursprung in Dateien im Repo oder in klar genannten Quellen.

== Ordner und ihre Aufgabe
Ich halte die Struktur einfach und schreibe zu jedem Ordner einen klaren Satz, damit ein Laie sofort versteht, was drin ist.

- code: Skripte, die Daten aufbereiten, Features bauen, Modelle trainieren, evaluieren.
- data: Datendateien. Unterordner für roh, verarbeitet und Features.
- out: erzeugte Artefakte wie Modelle, Metriken, Grafiken.
- docs: schriftliche Arbeit, Grundlagen, Regeln, Theorie.
- journal: kurze Tagesnotizen mit Datum, was gemacht wurde, was noch offen ist.

== Benennungen und Versionen
- Datumsformat: JJJJ-MM-TT im Dateinamen, damit Sortierung stimmt.
- Saisonformat: 2023-24 im Dateinamen, wenn eine Datei saisonbezogen ist.
- Ergebnisse: Dateiname enthält Zweck und Datum, zum Beispiel mae_test_2023-24_2025-10-30.txt.
- Modelle: Dateiname enthält Modelltyp und Zeit, zum Beispiel rf_model_2025-10-30.pkl.
- Zufall: Ich setze einen festen random_state und notiere ihn im Journal.

== Umgebung einrichten
Ich beschreibe die Schritte so, dass Anfänger sie ausführen können.

- Python installieren (eine aktuelle 3.x-Version).
- Virtuelle Umgebung anlegen und aktivieren.
- Abhängigkeiten installieren (zum Beispiel mit requirements.txt).
- Typst installieren, um die Dokumente zu bauen.

Ich schreibe im Journal die tatsächlich verwendeten Versionen von Python, Paketmanager, Typst und den wichtigsten Bibliotheken auf.

== Datenquellen und Ablage
Ich arbeite mit Spieler-Daten pro Gameweek. Für Aussenstehende ist wichtig:
- Quelle nennen: woher die Daten stammen.
- Zeitraum nennen: welche Saisons und Gameweeks enthalten sind.
- Ablage nennen: in welchem Unterordner die Datei liegt.
- Wenn Daten nicht öffentlich sind, erkläre ich kurz, wie man zu vergleichbaren Daten kommt oder liefere eine kleine Beispieldatei.

Unterordner in data:
- data/roh: unveränderte Originaldateien.
- data/processed: bereinigte, zusammengeführte Versionen.
- data/features: tabellen mit abgeleiteten Features.

== Skripte und Einstiegspunkte
Ich halte die Benutzung kurz und konkret, damit ein Laie es schaffen kann.

- Vorbereitung: Skript für Aufbereitung und Feature-Bildung.
- Training: Skript, das ein Modell trainiert und speichert.
- Evaluation: Skript, das Baselines und Modell auf dem Testsatz vergleicht und Metriken ausgibt.

Ich schreibe im Journal pro Lauf:
- Welches Skript ich mit welchen Argumenten gestartet habe.
- Welche Eingabedateien verwendet wurden.
- Welche Ausgabedateien entstanden sind und wo sie liegen.

== Laufanleitung in wenigen Schritten
1. Umgebung aktivieren und Abhängigkeiten installieren.
2. Daten in data/roh ablegen.
3. Aufbereitung/Features starten und prüfen, ob Dateien in data/processed und data/features erzeugt wurden.
4. Training starten und prüfen, ob ein Modell in out gespeichert wurde.
5. Evaluation starten und prüfen, ob MAE-Werte und Grafiken in out erzeugt wurden.

Ich schreibe diese fünf Punkte in mein Journal und hake sie pro Lauf ab.

== Was ich nach jedem Lauf speichere
- Metriken: ein kurzer Text mit MAE im Test und den Baseline-Werten.
- Konfiguration: Hyperparameter, random_state, Zeitraum der Trainings- und Testdaten.
- Modell: wenn sinnvoll, die gespeicherte Modelldatei.
- Grafiken: Vergleich Modell vs. Baselines, Fehler nach Position, Feature-Wichtigkeit.
- Log: Datum, Skriptaufruf, besondere Beobachtungen.

== Journal und Commits
- Journal: pro Arbeitstag ein Eintrag mit den Abschnitten Arbeitsschritte und Nächste Schritte. Ich nenne konkrete Dateien und Ergebnisse.
- Commits: kurze, klare Nachrichten in Deutsch. Beispiele:
  - Theorie: 04 Pipeline & Modell erstellt
  - Data: features 2023-24 generiert
  - Eval: MAE Test vs Baselines exportiert

== Prüfliste vor Abgabe
- Alle Beschreibungen stimmen mit den tatsächlichen Dateinamen überein.
- Jeder wichtige Plot hat Lesesatz, Achsen, Zeitraum, Quelle.
- Jeder im Text genannte Wert ist in einer Datei im Repo auffindbar.
- Modelle, Metriken und Datenstände sind datiert und im Journal verlinkt.
- Zufallsstartwert ist notiert und wurde gesetzt.

== Datenschutz und Rechte
- Wenn Daten Personenbezug haben könnten, entferne ich Identifikatoren oder nutze nur offene, unkritische Felder.
- Ich respektiere Lizenzen von Quellen und nenne sie im Literatur- oder Quellenverzeichnis.
- Ich speichere keine geheimen Schlüssel im Repo. Wenn ich welche brauche, erkläre ich im Journal, wie man lokal eine .env anlegt.

== Was ein Laie nach diesem Kapitel versteht
- Wo die Dinge liegen, was sie bedeuten und wie man einen Lauf startet.
- Welche Dateien nach einem Lauf entstehen und wie man sie liest.
- Wie ich sicherstelle, dass Ergebnisse wiederholbar sind.
]
