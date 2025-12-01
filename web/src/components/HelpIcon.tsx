// web/src/components/HelpIcon.tsx
import * as React from 'react'
// @ts-ignore: Fehlende Typdefinitionen für Radix Tooltip
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

type HelpIconProps = {
    text: string
    side?: 'top' | 'right' | 'bottom' | 'left'
}

export const HelpIcon: React.FC<HelpIconProps> = ({ text, side = 'top' }) => {
    return (
        <TooltipPrimitive.Provider delayDuration={150}>
            <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                    <button
                        type="button"
                        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-500 text-[10px] font-bold text-slate-200 hover:bg-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
                        aria-label="Hilfe"
                    >
                        ?
                    </button>
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        side={side}
                        align="center"
                        sideOffset={6}
                        className="z-50 max-w-xs rounded-lg border border-slate-600 bg-slate-900/95 px-3 py-2 text-xs leading-relaxed text-slate-100 shadow-xl"
                    >
                        {text}
                        <TooltipPrimitive.Arrow className="fill-slate-900" />
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    )
}
