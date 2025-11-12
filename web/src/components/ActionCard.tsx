import { motion } from 'framer-motion'
import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface ActionCardProps {
    title: string
    description: string
    icon: LucideIcon
    href: string
    gradient: string
    delay?: number
}

export function ActionCard({
    title,
    description,
    icon: Icon,
    href,
    gradient,
    delay = 0
}: ActionCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="group"
        >
            <Link href={href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 rounded-xl" aria-label={title}>
                <div className="relative h-full p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 overflow-hidden">
                    {/* Gradient Background on Hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                    {/* Content */}
                    <div className="relative space-y-4">
                        {/* Icon */}
                        <div className={`inline-flex p-4 bg-gradient-to-br ${gradient} rounded-xl shadow-lg`} aria-hidden="true">
                            <Icon className="h-8 w-8 text-white" />
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {title}
                        </h3>

                        {/* Description */}
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            {description}
                        </p>

                        {/* CTA */}
                        <div className="pt-2">
                            <span className={`inline-flex items-center text-sm font-semibold bg-gradient-to-r ${gradient} bg-clip-text text-transparent group-hover:translate-x-1 transition-transform duration-300`}>
                                Los geht&apos;s →
                            </span>
                        </div>
                    </div>

                    {/* Decorative Corner */}
                    <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-10 group-hover:opacity-20 transition-opacity" aria-hidden="true">
                        <Icon className="w-full h-full text-gray-400" />
                    </div>
                </div>
            </Link>
        </motion.div>
    )
}
