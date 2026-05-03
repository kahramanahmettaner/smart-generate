import { nanoid } from 'nanoid'

export const generateId = (prefix: string) => `${prefix}_${nanoid(8)}`

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// Makes a name unique within a set of existing names.
// "hero" → "hero 2" → "hero 3" etc.
export function uniqueName(desired: string, existingNames: string[]): string {
  if (!existingNames.includes(desired)) return desired

  let counter = 2
  while (existingNames.includes(`${desired} ${counter}`)) {
    counter++
  }
  return `${desired} ${counter}`
}