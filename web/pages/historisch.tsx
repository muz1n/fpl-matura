import Head from 'next/head'

export default function HistorischPage() {
    return (
        <>
            <Head>
                <title>Historisch – FPL Assistent</title>
                <meta name="description" content="Historische Auswertungen" />
            </Head>
            <div className="max-w-5xl mx-auto px-4 space-y-6 mt-6">
                <div className="bg-red-100 border border-red-400 text-red-800 px-6 py-4 rounded-lg mb-8 text-center font-bold text-xl">
                    Diese Funktion ist nicht Teil der Maturaarbeit und daher deaktiviert.
                </div>
            </div>
        </>
    )
}
