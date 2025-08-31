import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export phone utilities for convenience
export { sanitizePhone, formatPhoneMask, isValidPhone, getPhoneForAPI } from './utils/phone';
