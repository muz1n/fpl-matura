import Head from 'next/head'
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
    const router = useRouter()

    useEffect(() => {
        router.replace('/info')
    }, [router])

    return (
        <>
            <Head>
                <title>FPL Maturaarbeit</title>
            </Head>
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-600 dark:text-gray-400">Weiterleitung zur Info-Seite...</p>
            </div>
        </>
    )
}
