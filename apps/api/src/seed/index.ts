import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@flowforge/shared/db/schema'
import { runMigrations } from '@flowforge/shared/db/migrate'
import { users, workflows, workflowRuns } from '@flowforge/shared/db/schema'
import { hashPassword } from '../auth/service.js'

const DATABASE_URL = process.env['DATABASE_URL']!

const AI_DEFINITION = {
  name: 'ai-document-ingestion',
  description: 'Extracts text from a PDF, chunks it, generates OpenAI embeddings, and stores them in pgvector.',
  tasks: [
    { id: 'extract', type: 'extract-text' },
    { id: 'chunk', type: 'chunk-text', dependsOn: ['extract'] },
    { id: 'embed', type: 'generate-embeddings', dependsOn: ['chunk'] },
    { id: 'store', type: 'store-vectors', dependsOn: ['chunk', 'embed'] },
    { id: 'done', type: 'notify-complete', dependsOn: ['store'] },
  ],
}

const NOTIFY_DEFINITION = {
  name: 'simple-notify-pipeline',
  description: 'A three-step sequential pipeline for demonstrating basic orchestration.',
  tasks: [
    { id: 'step-1', type: 'notify-complete' },
    { id: 'step-2', type: 'notify-complete', dependsOn: ['step-1'] },
    { id: 'step-3', type: 'notify-complete', dependsOn: ['step-2'] },
  ],
}

const DIAMOND_DEFINITION = {
  name: 'parallel-diamond-pipeline',
  description: 'Demonstrates parallel branch execution and convergence in a diamond-shaped DAG.',
  tasks: [
    { id: 'init', type: 'notify-complete' },
    { id: 'branch-a', type: 'notify-complete', dependsOn: ['init'] },
    { id: 'branch-b', type: 'notify-complete', dependsOn: ['init'] },
    { id: 'merge', type: 'notify-complete', dependsOn: ['branch-a', 'branch-b'] },
  ],
}

export async function seed(): Promise<void> {
  await runMigrations(DATABASE_URL)

  const pool = new Pool({ connectionString: DATABASE_URL })
  const db = drizzle(pool, { schema })

  const DEMO_EMAIL = 'demo@flowforge.io'
  const DEMO_PASSWORD = 'demo'

  let demoUser = await db.query.users.findFirst({
    where: eq(users.email, DEMO_EMAIL),
  })

  if (!demoUser) {
    const passwordHash = await hashPassword(DEMO_PASSWORD)
    const [created] = await db.insert(users).values({ email: DEMO_EMAIL, passwordHash }).returning()
    demoUser = created!
    console.log(`Created demo user: ${DEMO_EMAIL}`)
  } else {
    console.log(`Demo user already exists: ${DEMO_EMAIL}`)
  }

  for (const definition of [AI_DEFINITION, NOTIFY_DEFINITION, DIAMOND_DEFINITION]) {
    const existing = await db.query.workflows.findFirst({
      where: eq(workflows.name, definition.name),
    })
    if (!existing) {
      await db.insert(workflows).values({
        userId: demoUser.id,
        name: definition.name,
        description: definition.description,
        definition,
      })
      console.log(`Created workflow: ${definition.name}`)
    } else {
      console.log(`Workflow already exists: ${definition.name}`)
    }
  }

  const simpleWf = await db.query.workflows.findFirst({
    where: eq(workflows.name, 'simple-notify-pipeline'),
  })

  if (simpleWf) {
    const existingRun = await db.query.workflowRuns.findFirst({
      where: eq(workflowRuns.workflowId, simpleWf.id),
    })
    if (!existingRun) {
      console.log('Queuing a demo run of simple-notify-pipeline...')
      const { startRun } = await import('../runs/engine.js')
      await startRun(simpleWf.id, { seeded: true })
      console.log('Demo run queued — worker will process it on startup.')
    }
  }

  await pool.end()
  console.log('Seed complete.')
}

if (process.argv[1]?.endsWith('seed/index.ts') || process.argv[1]?.endsWith('seed/index.js')) {
  seed().catch((err) => { console.error('Seed failed:', err); process.exit(1) })
}
