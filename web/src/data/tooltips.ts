/**
 * Zentrale Tooltip-Definitionen für technische Fachbegriffe
 * Ausführliche Erklärungen für Lehrer und interessierte Nutzer
 */

export const tooltips = {
    predicted_points: 
        "Die vom Modell für den nächsten Spieltag vorhergesagten FPL-Punkte. Basis sind historische Daten (vergangene Performance, Gegner, Heim/Auswärts) und Algorithmen (Random Forest, Moving Average etc.). Je höher, desto aussichtsreicher der Spieler.",
    
    ict_index: 
        "ICT Index kombiniert drei Kennzahlen: Influence (Einfluss aufs Spiel), Creativity (Chancenkreierung) und Threat (Torraumgefahr). Hohe Werte signalisieren aktive, punktestarke Spieler. Wird von der offiziellen FPL-API bereitgestellt.",
    
    effizienz: 
        "Effizienz = (Erreichte Punkte / Maximale theoretische Punkte) × 100%. Die maximalen Punkte stammen vom 'Hindsight Optimum' – dem theoretisch besten Team, das man mit perfekter Zukunftssicht hätte wählen können. Zeigt, wie nah die Prognose am Optimum lag.",
    
    hindsight_optimum: 
        "Das theoretisch beste Team, das man hätte aufstellen können, wenn man die tatsächlichen Punkte im Voraus gekannt hätte. Wird nachträglich aus den Realdaten berechnet. Dient als Benchmark: Keine Vorhersage kann besser sein als das Hindsight-Optimum.",
    
    captain_bonus: 
        "Der Captain (Kapitän) erhält in FPL doppelte Punkte. Das Modell wählt automatisch den Spieler mit der höchsten Punktprognose als Captain. Der Vice-Captain ist die Absicherung, falls der Captain nicht spielt.",
    
    feature_importance: 
        "Zeigt, welche Merkmale (Features) das KI-Modell am stärksten nutzt, um Vorhersagen zu treffen. Beispiel: 'form_3' (Formkurve letzte 3 Spieltage) oder 'opponent_strength' (Gegnerstärke). Hohe Wichtigkeit = starker Einfluss auf Prognose.",
    
    kumulativ: 
        "Kumulativ = Aufaddiert über mehrere Gameweeks. Statt Einzelwerte für GW 1, GW 2, GW 3 sieht man die Summe: GW 1, GW 1+2, GW 1+2+3 etc. Zeigt Entwicklung über die Zeit, nicht nur Einzelmomente.",
    
    gw_range: 
        "Gameweek-Bereich, z.B. '1-5' bedeutet Gameweek 1 bis 5. Ermöglicht Auswertungen über mehrere Spieltage, um Trends und Konsistenz zu analysieren.",
    
    method: 
        "Vorhersagemethode: 'Random Forest' = KI-Modell (Machine Learning), 'MA3' = Formdurchschnitt (letzte 3 Spiele), 'Pos' = Positionsmittel (Durchschnitt aller Spieler auf derselben Position). Verschiedene Ansätze, unterschiedliche Stärken.",
    
    rf_baseline: 
        "Random Forest Baseline: Klassisches Machine-Learning-Modell, trainiert mit historischen Spielerdaten. Nutzt Merkmale wie Form, Gegner, Position, um zukünftige Punkte vorherzusagen. Dient als Vergleichsbasis für andere Methoden.",
    
    ma3: 
        "Moving Average 3 Gameweeks: Einfacher Ansatz, bei dem die Prognose = Durchschnitt der letzten 3 Spieltage ist. Keine KI, nur Vergangenheitswerte. Schnell, aber weniger präzise als Random Forest.",
    
    pos: 
        "Positionsmittel: Prognose = Durchschnitt aller Spieler derselben Position (GK, DEF, MID, FWD). Sehr einfach, ignoriert individuelle Unterschiede. Dient als naive Baseline.",
    
    multi_season: 
        "Multi-Season-Analyse: Vergleich der Modellperformance über mehrere Saisons hinweg (z.B. 2020-21, 2021-22, 2022-23). Zeigt, ob das Modell konsistent gute Ergebnisse liefert oder nur in einzelnen Jahren funktioniert. Wichtig für Robustheit.",
    
    formation: 
        "FPL erlaubt 11 Feldspieler in verschiedenen Aufstellungen: z.B. 3-4-3 (3 Verteidiger, 4 Mittelfeldspieler, 3 Stürmer). Das Modell wählt automatisch die beste Formation basierend auf prognostizierten Punkten.",
} as const

export type TooltipKey = keyof typeof tooltips
