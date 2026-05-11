import fs from 'fs/promises'
import path from 'path'
import { config } from '../../config.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolvePath(key: string): string {
  // Prevent path traversal attacks
  const resolved = path.resolve(config.storagePath, key)
  if (!resolved.startsWith(path.resolve(config.storagePath))) {
    throw new Error('Invalid storage key')
  }
  return resolved
}

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

// ── Public API ────────────────────────────────────────────────────────────────
// These three functions are the ONLY interface to storage.
// To swap to R2: replace the implementations below, keep the signatures.

/**
 * Write a file to storage.
 * @returns The public URL to serve this file
 */
export async function writeFile(
  key: string,
  buffer: Buffer,
  _mimeType: string,
): Promise<string> {
  const filePath = resolvePath(key)
  await ensureDir(filePath)
  await fs.writeFile(filePath, buffer)
  // Local: serve via /files/:key route
  return `/files/${key}`
}

/**
 * Read a file from storage.
 */
export async function readFile(key: string): Promise<Buffer> {
  const filePath = resolvePath(key)
  return fs.readFile(filePath)
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(key: string): Promise<void> {
  const filePath = resolvePath(key)
  try {
    await fs.unlink(filePath)
  } catch (err: unknown) {
    // Ignore if file doesn't exist — deletion is idempotent
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
}