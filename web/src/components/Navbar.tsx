import Link from 'next/link'
import { useRouter } from 'next/router'
import { BarChart3, BrainCircuit, LineChart, Info, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function Navbar() {
    const router = useRouter()
    const [darkMode, setDarkMode] = useState(false)

    // Dark Mode initialisieren und persistieren
    useEffect(() => {
        const savedMode = localStorage.getItem('darkMode') === 'true'
        setDarkMode(savedMode)
        if (savedMode) {
            document.documentElement.classList.add('dark')
        }
    }, [])

    const toggleDarkMode = () => {
        const newMode = !darkMode
        setDarkMode(newMode)
        localStorage.setItem('darkMode', String(newMode))
        if (newMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    const isActive = (path: string) => router.pathname === path

    const links = [
        { href: '/predictions', label: 'Prognosen', icon: LineChart },
        { href: '/backtest', label: 'Backtest', icon: BarChart3 },
        { href: '/multi-season-backtest', label: 'Multi-Season', icon: BarChart3 },
        { href: '/feature-importance', label: 'Feature Importance', icon: BrainCircuit },
        { href: '/info', label: 'Info', icon: Info },
    ]

    return (
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo / Titel */}
                    <Link href="/info" className="flex items-center gap-2 font-bold text-xl text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        <BarChart3 className="w-6 h-6" />
                        <span>FPL Maturaarbeit</span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-1">
                        {links.map((link) => {
                            const Icon = link.icon
                            const active = isActive(link.href)

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                                        ${active
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }
                                    `}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{link.label}</span>
                                </Link>
                            )
                        })}

                        {/* Dark Mode Toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className="ml-2 p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Dark Mode umschalten"
                        >
                            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    )
}
