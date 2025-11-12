import Head from 'next/head'

export default function Home() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <Head>
                <title>FPL Matura — Demo</title>
            </Head>

            <main className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
                <h1 className="text-2xl font-bold mb-4">FPL Matura — Demo</h1>

                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded">
                    <h2 className="text-lg font-semibold mb-2 text-emerald-900">View Predictions & Lineup</h2>
                    <p className="text-sm text-emerald-800 mb-3">
                        See the full predictions and lineup display with interactive tables
                    </p>
                    <a
                        href="/predictions"
                        className="inline-block px-4 py-2 bg-emerald-600 text-white font-medium rounded hover:bg-emerald-700 transition-colors"
                    >
                        View Predictions →
                    </a>
                </div>

                <h2 className="text-lg font-semibold mb-2">Tech Stack</h2>
                <p className="mb-4 text-slate-600">Next.js 15 + TypeScript + Tailwind CSS</p>

                <h2 className="text-lg font-semibold mb-2">Raw Demo Files</h2>
                <p className="mb-2 text-sm text-slate-600">Files in <code className="bg-slate-100 px-1 rounded">/public/demo</code>:</p>
                <ul className="list-disc pl-5 space-y-2 mb-6">
                    <li>
                        <a className="text-sky-600 hover:underline" href="/demo/predictions_gw38.json">/demo/predictions_gw38.json</a>
                    </li>
                    <li>
                        <a className="text-sky-600 hover:underline" href="/demo/lineup_gw38.json">/demo/lineup_gw38.json</a>
                    </li>
                </ul>

                <div className="pt-4 border-t border-slate-200 text-sm text-slate-500">
                    <p>TypeScript interfaces defined in <code className="bg-slate-100 px-1 rounded">/types/fpl.ts</code></p>
                </div>

                <section className="mt-6 pt-4 border-t border-slate-200 text-sm space-x-4">
                    <a className="underline" href="/demo/predictions_gw38.json">Predictions JSON</a>
                    <a className="underline" href="/demo/lineup_gw38.json">Lineup JSON</a>
                </section>
            </main>
        </div>
    )
}
