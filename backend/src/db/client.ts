import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { config } from '../config.js'
import * as schema from './schema.js'

const pool = new Pool({ connectionString: config.databaseUrl })

export const db = drizzle(pool, { schema })

// Test connection on startup
export async function connectDb(): Promise<void> {
  const client = await pool.connect()
  client.release()
  console.log('✅ Database connected')
}
