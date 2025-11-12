"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../../lib/utils"

interface TooltipProps {
    content: string
    children: React.ReactNode
    side?: "top" | "bottom" | "left" | "right"
}

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const id = React.useId()

    const positions = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
        left: "right-full top-1/2 -translate-y-1/2 mr-2",
        right: "left-full top-1/2 -translate-y-1/2 ml-2",
    }

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
        >
            {children}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                            "absolute z-50 px-3 py-2 text-sm rounded-lg shadow-lg",
                            "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900",
                            "max-w-xs whitespace-normal",
                            "pointer-events-none",
                            positions[side]
                        )}
                        id={id}
                        role="tooltip"
                        aria-hidden={!isOpen}
                    >
                        {content}
                        {/* Arrow */}
                        <div
                            className={cn(
                                "absolute w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45",
                                side === "top" && "bottom-[-4px] left-1/2 -translate-x-1/2",
                                side === "bottom" && "top-[-4px] left-1/2 -translate-x-1/2",
                                side === "left" && "right-[-4px] top-1/2 -translate-y-1/2",
                                side === "right" && "left-[-4px] top-1/2 -translate-y-1/2"
                            )}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
