// Glossar für FPL-Fachbegriffe
// Alle Begriffe werden auf Deutsch erklärt, max. 1-2 Sätze

export const glossary = {
    // Modelle und Methoden
    randomForest: "Ein Machine-Learning-Modell, das viele Entscheidungsbäume kombiniert, um präzisere Vorhersagen zu treffen.",

    formdurchschnitt: "Der Durchschnitt der Punkte aus den letzten 3 Spielen eines Spielers.",

    positionsmittel: "Die durchschnittliche Punktzahl aller Spieler auf derselben Position (Torwart, Verteidiger, Mittelfeld, Sturm).",

    // Methoden-Kürzel
    methodeRF: "Random Forest - KI-Modell mit höchster Genauigkeit, nutzt historische Daten und Statistiken.",

    methodeMA3: "Formdurchschnitt - Einfache Methode basierend auf den letzten 3 Spielen eines Spielers.",

    methodePos: "Positionsmittel - Durchschnittspunkte pro Position als Baseline-Vorhersage.",

    // FPL-spezifische Begriffe
    gameweek: "Eine Spielrunde in der Premier League. Die Saison hat 38 Gameweeks.",

    captain: "Der Kapitän deines Teams erhält doppelte Punkte für diese Gameweek.",

    viceCaptain: "Der Vize-Kapitän wird automatisch zum Kapitän, falls dein Kapitän nicht spielt.",

    startelf: "Die 11 Spieler, die in dieser Gameweek Punkte sammeln. Du hast auch eine Bank mit 4 Ersatzspielern.",

    bank: "4 Ersatzspieler, die nur eingewechselt werden, wenn ein Startspieler nicht spielt.",

    formation: "Die Aufstellung deines Teams (z.B. 3-4-3 = 3 Verteidiger, 4 Mittelfeldspieler, 3 Stürmer).",

    transfer: "Du kannst Spieler in deinem Team austauschen. Pro Gameweek ist 1 Transfer kostenlos, weitere kosten je 4 Punkte.",

    // Statistiken
    erwartePunkte: "Die prognostizierten Punkte basierend auf Form, Gegner und historischen Daten.",

    prognose: "Eine KI-gestützte Vorhersage, wie viele Punkte ein Spieler voraussichtlich erzielen wird.",

    heimspiel: "Wenn ein Team zuhause spielt (meist mit 'vs' gekennzeichnet).",

    auswaertsspiel: "Wenn ein Team auswärts spielt (meist mit '@' gekennzeichnet).",

    // Technische Begriffe
    modellVersion: "Die Version des KI-Modells, das für die Prognosen verwendet wurde.",

    regelPruefung: "Prüfung, ob die Aufstellung alle FPL-Regeln einhält (Budget, Spieleranzahl, max. 3 Spieler pro Team).",

    // Positionen
    torwart: "Torwart (GK) - erhält Punkte für gehaltene Bälle und Clean Sheets.",

    verteidiger: "Verteidiger (DEF) - erhält Punkte für Clean Sheets und defensive Aktionen.",

    mittelfeld: "Mittelfeldspieler (MID) - erhält Punkte für Tore, Assists und Clean Sheets.",

    sturm: "Stürmer (FWD) - erhält Punkte hauptsächlich für Tore und Assists.",

    cleanSheet: "Wenn ein Team kein Gegentor kassiert. Verteidiger und Torhüter erhalten dafür Bonuspunkte.",

    // Weitere wichtige Begriffe
    budget: "Du hast 100 Millionen £, um dein 15-Spieler-Team zusammenzustellen.",

    preis: "Der Preis eines Spielers in Millionen £. Der Preis ändert sich basierend auf Nachfrage.",
} as const

export type GlossaryKey = keyof typeof glossary
