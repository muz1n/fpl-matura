



import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";
import { Layout } from "@/src/components/Layout"; // Layout enthält deine Navbar
import { Poppins } from "next/font/google";
import { useEffect } from "react";

// Lade den Poppins Font (ähnlich Premier League Style)
const poppins = Poppins({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
    display: "swap",
    variable: "--font-poppins"
});

function MyApp({ Component, pageProps }: AppProps) {
    // Setze Body-Hintergrund global
    useEffect(() => {
        document.body.style.background = 'linear-gradient(135deg, rgb(15, 23, 42) 0%, rgba(88, 28, 135, 0.35) 50%, rgb(15, 23, 42) 100%)';
        document.body.style.minHeight = '100vh';
        document.documentElement.style.background = 'linear-gradient(135deg, rgb(15, 23, 42) 0%, rgba(88, 28, 135, 0.35) 50%, rgb(15, 23, 42) 100%)';
    }, []);

    return (
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <div className={poppins.className}>
                <Layout>
                    <Component {...pageProps} />
                </Layout>
            </div>
        </ThemeProvider>
    );
} export default MyApp;
