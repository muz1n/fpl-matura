
import Head from 'next/head'
import Link from 'next/link'
import { Navbar } from '../src/components/Navbar'

export default function TeamPage() {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-100">
            <Head>
                <title>Team – FPL Assistent</title>
                <meta name="description" content="Verwalte dein Fantasy Premier League Team" />
            </Head>
            <Navbar />
            <div className="max-w-3xl mx-auto px-4 py-16">
                <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg px-6 py-8 text-center space-y-3">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-100">
                        Teamverwaltung – Platzhalter
                    </h1>
                    <p className="text-sm md:text-base text-slate-300 max-w-xl mx-auto">
                        Diese Seite ist aktuell nur ein Platzhalter. Die direkte Verwaltung eines echten FPL-Accounts ist nicht Teil der Maturaarbeit.
                    </p>
                    <div className="mt-4">
                        <Link href="/">
                            <button className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
                                Zur Startseite
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
