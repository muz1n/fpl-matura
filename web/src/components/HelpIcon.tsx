import { HelpCircle } from "lucide-react"
import { Tooltip } from "./Tooltip"

interface HelpIconProps {
    text: string
    side?: "top" | "bottom" | "left" | "right"
}

export function HelpIcon({ text, side = "top" }: HelpIconProps) {
    return (
        <Tooltip content={text} side={side}>
            <button
                className="inline-flex items-center justify-center w-4 h-4 ml-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 rounded"
                aria-label={text}
                aria-describedby={undefined}
                type="button"
            >
                <HelpCircle className="w-4 h-4" />
            </button>
        </Tooltip>
    )
}
