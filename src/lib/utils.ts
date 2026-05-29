import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Recursively transforms snake_case keys to camelCase.
 * Used to convert Supabase PostgREST responses to the camelCase format
 * expected by the frontend TypeScript interfaces.
 */
export function toCamel<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(item => toCamel(item)) as unknown as T;
  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
      result[camelKey] = toCamel(value);
    }
    return result as T;
  }
  return obj;
}
