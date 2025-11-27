import Head from 'next/head'

export default function HelpPage() {
    return (
        <>
            <Head>
                <title>Hilfe – FPL Assistent</title>
                <meta name="description" content="Hilfe und Informationen zum FPL Assistenten" />
            </Head>
            <div className="min-h-screen bg-slate-900 text-slate-100">
                <div className="max-w-3xl mx-auto px-4 py-16">
                    <div className="bg-slate-900/80 border border-amber-500/70 text-amber-100 px-6 py-5 rounded-2xl text-center shadow-lg mb-8">
                        <div className="text-base md:text-lg font-semibold">
                            Diese Funktion ist nicht Teil der Maturaarbeit und daher deaktiviert.
                        </div>
                        <div className="text-xs md:text-sm text-amber-200/90 mt-2">
                            Diese Seite ist nur als Platzhalter sichtbar und wird in der Maturaarbeit nicht bewertet.
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
