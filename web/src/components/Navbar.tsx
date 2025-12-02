import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { TrendingUp, Target, BarChart3, Info, Calendar, Activity, Layers, BookOpen } from 'lucide-react'

export function Navbar() {
    const router = useRouter()
    // Dark Mode dauerhaft aktivieren
    React.useEffect(() => {
        document.documentElement.classList.add('dark')
    }, [])
    const isActive = (path: string) => router.pathname === path
    const links = [
        { href: '/prognosen', label: 'Prognosen', icon: TrendingUp },
        { href: '/backtest', label: 'Backtest', icon: Activity },
        { href: '/multi-season', label: 'Multi-Season', icon: Calendar },
        { href: '/feature-importance', label: 'Feature Importance', icon: BarChart3 },
        { href: '/methodik', label: 'Methodik', icon: Layers },
        { href: '/glossar', label: 'Glossar', icon: BookOpen },
        { href: '/info', label: 'Info', icon: Info },
    ]

    return (
        <nav className="w-full bg-gradient-to-r from-slate-900 via-purple-900/30 to-slate-900 border-b border-pink-500/20 sticky top-0 z-50 shadow-lg backdrop-blur-sm">
            <div className="mx-auto px-4 max-w-7xl">
                <div className="flex items-center justify-between h-16">
                    {/* Logo / Titel - KEIN Icon */}
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white hover:text-pink-400 transition-colors">
                        <span>FPL Matura</span>
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
                                            ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/30'
                                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-pink-400'
                                        }
                                    `}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{link.label}</span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>
        </nav>
    )
}
