import { nanoid } from 'nanoid'

export const generateId = (prefix: string) => `${prefix}_${nanoid(8)}`

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}