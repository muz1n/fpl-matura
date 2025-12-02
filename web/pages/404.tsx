import Head from 'next/head'

export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-100">
            <Head>
                <title>404 - Seite nicht gefunden</title>
            </Head>
            <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
                <div className="text-6xl md:text-7xl font-bold text-slate-600">404</div>
                <h1 className="text-xl md:text-2xl font-semibold text-slate-100">Seite nicht gefunden</h1>
                <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto">Die aufgerufene Route existiert nicht. Bitte überprüfe die URL oder kehre zur Startseite zurück.</p>
                <a href="/" className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium mt-4">
                    Zur Startseite
                </a>
            </div>
        </div>
    )
}
