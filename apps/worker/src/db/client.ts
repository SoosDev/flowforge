import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@flowforge/shared/db/schema'
import { env } from '../config.js'

const pool = new Pool({ connectionString: env.DATABASE_URL })
export const db = drizzle(pool, { schema })