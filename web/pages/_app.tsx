import type { AppProps } from 'next/app'
import { ThemeProvider } from '../src/components/theme-provider'
import { Layout } from '../src/components/Layout'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Layout>
                <Component {...pageProps} />
            </Layout>
        </ThemeProvider>
    )
}
