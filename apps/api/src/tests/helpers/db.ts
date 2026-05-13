import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@flowforge/shared/db/schema'
import { sql } from 'drizzle-orm'

const pool = new Pool({
  connectionString: 'postgresql://flowforge:flowforge@localhost:5433/flowforge_test',
})

export const testDb = drizzle(pool, { schema })

export async function cleanDb(): Promise<void> {
  await testDb.execute(sql`
    TRUNCATE TABLE embeddings, job_logs, task_runs, workflow_runs, workflows, workers, users
    RESTART IDENTITY CASCADE
  `)
}
