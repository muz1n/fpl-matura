import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Hilfsfunktion zum Zusammenführen von Tailwind CSS Klassen
 * Kombiniert clsx und tailwind-merge für konfliktfreie Klassen
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
