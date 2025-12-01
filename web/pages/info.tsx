import Head from 'next/head'
import {
    InformationCircleIcon,
    Squares2X2Icon,
    ServerStackIcon,
    BeakerIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

export default function InfoPage() {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-100">
            <Head>
                <title>Informationen zur WebApp – FPL Assistent</title>
                <meta
                    name="description"
                    content="Überblick über die FPL WebApp, verwendete Daten, Prognosemethoden und Grenzen des Modells."
                />
            </Head>

            <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
                {/* Hero / Einordnung */}
                <section className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-7 md:p-8">
                    <div className="grid gap-6 md:grid-cols-[minmax(0,2fr),minmax(0,1.3fr),minmax(0,1.3fr)] items-start">
                        {/* Linke Spalte */}
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 text-emerald-300">
                                <InformationCircleIcon className="h-6 w-6" />
                                <span className="text-sm font-medium tracking-wide uppercase">
                                    Informationen zur WebApp
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                                FPL Assistent – KI-gestützte Teamoptimierung
                            </h1>
                            <p className="text-sm md:text-base text-slate-200 max-w-xl">
                                Diese WebApp gehört zu einer Maturaarbeit und zeigt,
                                wie gut verschiedene Prognosemethoden im Fantasy Premier
                                League funktionieren. Sie richtet sich an Lehrpersonen,
                                Schülerinnen und Schüler sowie FPL-Interessierte.
                            </p>
                        </div>

                        {/* Kernfrage */}
                        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 md:p-5 space-y-1">
                            <p className="text-xs font-semibold text-emerald-300 tracking-wide uppercase">
                                Kernfrage
                            </p>
                            <p className="text-sm md:text-base text-slate-100 font-medium">
                                Wie gut kann ein KI-Modell FPL-Punkte im Voraus schätzen?
                            </p>
                            <p className="text-xs md:text-sm text-slate-300">
                                Ziel ist ein nachvollziehbares Beispiel, wie Machine Learning
                                in einem klar abgegrenzten Szenario eingesetzt und beurteilt werden kann.
                            </p>
                        </div>

                        {/* Rahmen */}
                        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 md:p-5 space-y-1">
                            <p className="text-xs font-semibold text-emerald-300 tracking-wide uppercase">
                                Rahmen
                            </p>
                            <p className="text-sm md:text-base text-slate-100 font-medium">
                                Mehrere Saisons – pro Saison ein eigenes Modell.
                            </p>
                            <p className="text-xs md:text-sm text-slate-300">
                                Für jede Saison wird ein separates Modell trainiert und
                                innerhalb derselben Saison getestet. Es findet keine
                                echte Cross-Season-Validierung statt, die Modelle werden aber
                                für mehrere Saisons parallel ausgewertet.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Überblick Seiten */}
                <section className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-7 md:p-8 space-y-5">
                    <div className="flex items-center gap-3">
                        <Squares2X2Icon className="h-6 w-6 text-sky-300" />
                        <h2 className="text-xl font-semibold tracking-tight">
                            Überblick: Welche Seiten gibt es?
                        </h2>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        {/* Lineup-Builder */}
                        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 space-y-2">
                            <h3 className="text-base font-semibold">Lineup-Builder</h3>
                            <p className="text-sm text-slate-200">
                                Interaktiver Pitch im FPL-Stil: Spieler per Drag-and-Drop auf
                                Startelf und Bank setzen, Captain und Vice-Captain markieren
                                und sehen, wie viele Punkte die Aufstellung laut Modell
                                erwarten lässt.
                            </p>
                        </div>

                        {/* Prognosen */}
                        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 space-y-2">
                            <h3 className="text-base font-semibold">Prognosen</h3>
                            <p className="text-sm text-slate-200">
                                Zeigt erwartete Punkte für alle Spieler in einer gewählten
                                Spielwoche. Filter nach Saison, Spielwoche, Position und
                                Prognosemethode. Dient als Beispiel, wie ein FPL-Manager das
                                Modell nutzen könnte.
                            </p>
                        </div>

                        {/* Backtest */}
                        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 space-y-2">
                            <h3 className="text-base font-semibold">Backtest</h3>
                            <p className="text-sm text-slate-200">
                                Vergleicht die Methoden über mehrere Spielwochen rückblickend.
                                Die Effizienz zeigt, wie nah eine Methode am theoretisch besten
                                Team (Hindsight-Optimum) lag.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        {/* Multi-Season */}
                        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 space-y-2">
                            <h3 className="text-base font-semibold">Multi-Season</h3>
                            <p className="text-sm text-slate-200">
                                Stellt die Effizienz der wichtigsten Methoden über mehrere
                                Saisons nebeneinander. Zeigt, ob ein Ansatz stabil bleibt oder
                                stark schwankt.
                            </p>
                        </div>

                        {/* Feature Importance */}
                        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 space-y-2">
                            <h3 className="text-base font-semibold">Feature Importance</h3>
                            <p className="text-sm text-slate-200">
                                Erklärt das Random-Forest-Modell: Welche Merkmale
                                (z.&nbsp;B. Preis, Form, Einsatztendenz) tragen wie stark zur
                                Vorhersage bei? Die Seite macht sichtbar, was das Modell
                                «gelernt» hat.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Daten */}
                <section className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-7 md:p-8 space-y-4">
                    <div className="flex items-center gap-3">
                        <ServerStackIcon className="h-6 w-6 text-sky-300" />
                        <h2 className="text-xl font-semibold tracking-tight">
                            Welche Daten werden verwendet?
                        </h2>
                    </div>
                    <p className="text-sm md:text-base text-slate-200">
                        Die Anwendung nutzt historische FPL-Daten aus vergangenen Saisons
                        (z.&nbsp;B. 2020-21 bis 2023-24). Es werden keine Live-Daten oder
                        in Echtzeit aktualisierte API-Abfragen verwendet.
                    </p>
                    <p className="text-sm md:text-base text-slate-200">
                        Jede Datei ist mit einem Saison-Präfix versehen, zum Beispiel{' '}
                        <code className="px-1.5 py-0.5 rounded bg-slate-900/80 text-xs border border-slate-700">
                            predictions_2022-23_gw38_rf.json
                        </code>
                        . So ist jederzeit klar, aus welcher Saison die Daten stammen und
                        welche Methode genutzt wurde.
                    </p>
                    <p className="text-sm md:text-base text-slate-200">
                        Die Datensätze enthalten pro Spieler und Spielwoche unter anderem:
                    </p>
                    <ul className="list-disc list-inside text-sm md:text-base text-slate-200 space-y-1">
                        <li>Punkte und Einsatzminuten</li>
                        <li>Preis und Position</li>
                        <li>
                            ICT-Index (Influence, Creativity, Threat) und weitere abgeleitete
                            Merkmale (z.&nbsp;B. Form über mehrere Wochen)
                        </li>
                    </ul>
                </section>

                {/* Prognosemethoden */}
                <section className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-7 md:p-8 space-y-5">
                    <div className="flex items-center gap-3">
                        <BeakerIcon className="h-6 w-6 text-sky-300" />
                        <h2 className="text-xl font-semibold tracking-tight">
                            Welche Prognosemethoden gibt es?
                        </h2>
                    </div>

                    {/* RF */}
                    <div className="space-y-2">
                        <h3 className="font-semibold text-slate-100">
                            Random Forest (RF, KI-Modell)
                        </h3>
                        <p className="text-sm md:text-base text-slate-200">
                            Ein Machine-Learning-Verfahren, das aus vielen Entscheidungsbäumen
                            besteht. Das Modell nutzt Merkmale wie Form, Preis, Einsatzminuten
                            und ICT-Werte. RF ist die Hauptmethode der Arbeit.
                        </p>
                        <p className="text-sm md:text-base text-slate-200">
                            Es gibt mehrere Varianten, die alle auf demselben Modell basieren,
                            aber die Teamwahl unterschiedlich einschränken:
                        </p>
                        <ul className="list-disc list-inside text-sm text-slate-200 space-y-1">
                            <li>
                                <span className="font-semibold">rf</span> – Standard-Modell
                                (Basisvergleich)
                            </li>
                            <li>
                                <span className="font-semibold">rf_pos</span> – berücksichtigt
                                die Position explizit bei der Auswahl
                            </li>
                            <li>
                                <span className="font-semibold">rf_rank</span> – bildet Spieler
                                nach Modell-Ranking und wählt dann ein Team
                            </li>
                            <li>
                                <span className="font-semibold">rf_filled / rf_relaxed</span> –
                                Varianten mit leicht anderen Constraints bei der
                                Teamausoptimierung
                            </li>
                        </ul>
                    </div>

                    {/* MA3 */}
                    <div className="space-y-2">
                        <h3 className="font-semibold text-slate-100">
                            MA3 (Formdurchschnitt, Moving Average)
                        </h3>
                        <p className="text-sm md:text-base text-slate-200">
                            Einfache Vergleichsmethode: Der Durchschnitt der letzten drei
                            Spielwochen wird als Prognose verwendet. Dient als intuitive
                            «Baseline» ohne KI.
                        </p>
                    </div>

                    {/* POS */}
                    <div className="space-y-2">
                        <h3 className="font-semibold text-slate-100">
                            POS (Positionsmittel, Durchschnitt pro Position)
                        </h3>
                        <p className="text-sm md:text-base text-slate-200">
                            Berechnet den Durchschnitt aller Spieler einer Position
                            (z.&nbsp;B. alle Stürmer). Zeigt, wie ein sehr simples Modell ohne
                            individuelle Spielerinformationen abschneiden würde.
                        </p>
                    </div>

                    {/* Effizienz */}
                    <div className="space-y-2">
                        <h3 className="font-semibold text-slate-100">
                            Effizienz (Punkte im Vergleich zum Optimum)
                        </h3>
                        <p className="text-sm md:text-base text-slate-200">
                            Keine eigene Vorhersagemethode, sondern eine Kennzahl: Sie
                            vergleicht die mit einer Methode erzielten Punkte mit dem
                            theoretisch besten möglichen Team. 100&nbsp;Prozent entsprechen
                            perfekter Auswahl.
                        </p>
                    </div>
                </section>

                {/* Grenzen */}
                <section className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-7 md:p-8 space-y-4">
                    <div className="flex items-center gap-3">
                        <ExclamationTriangleIcon className="h-6 w-6 text-amber-400" />
                        <h2 className="text-xl font-semibold tracking-tight">
                            Grenzen und Annahmen
                        </h2>
                    </div>

                    <div className="space-y-3 text-sm md:text-base text-slate-200">
                        <p>
                            <span className="font-semibold">Training pro Saison:</span> Für
                            jede Saison wird ein eigenes Modell trainiert und auf
                            Spielwochen derselben Saison getestet (z.&nbsp;B. 2020-21,
                            2021-22, 2022-23, 2023-24). Es gibt keine explizite
                            Cross-Season-Validierung; saisonübergreifende Muster werden nur
                            indirekt sichtbar.
                        </p>
                        <p>
                            <span className="font-semibold">Keine Live-Informationen:</span>{' '}
                            Verletzungen, Transfers, taktische Anpassungen oder kurzfristige
                            Form fliessen nicht ein. Die WebApp arbeitet bewusst nur mit
                            historischen Statistiken.
                        </p>
                        <p>
                            <span className="font-semibold">
                                Vereinfachte Realität im FPL:
                            </span>{' '}
                            Im echten Spiel beeinflussen viele weitere Faktoren die
                            Entscheidungen der Managerinnen und Manager. Das Projekt modelliert
                            nur einen Teil dieser Komplexität, dafür transparent und
                            nachvollziehbar.
                        </p>
                        <p>
                            <span className="font-semibold">Validierung nur mit alten Daten:</span>{' '}
                            Alle Methoden wurden mit historischen Spielwochen getestet. Die
                            Ergebnisse zeigen, was in der Vergangenheit funktioniert hat –
                            nicht, was garantiert in der Zukunft passieren wird.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    )
}
