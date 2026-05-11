import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { workflows } from '@flowforge/shared/db/schema'
import { validateDAG } from '@flowforge/shared'
import type { WorkflowDefinition } from '@flowforge/shared'

export async function listWorkflows(userId: string) {
  return db.query.workflows.findMany({
    where: eq(workflows.userId, userId),
    orderBy: (w, { desc }) => [desc(w.createdAt)],
  })
}

export async function getWorkflow(id: string) {
  return db.query.workflows.findFirst({
    where: eq(workflows.id, id),
    with: { runs: { orderBy: (r, { desc }) => [desc(r.createdAt)], limit: 10 } },
  })
}

export async function createWorkflow(
  userId: string,
  name: string,
  description: string | undefined,
  definition: unknown,
) {
  validateDAG((definition as WorkflowDefinition).tasks)
  const [workflow] = await db.insert(workflows).values({
    userId,
    name,
    description,
    definition: definition as WorkflowDefinition,
  }).returning()
  return workflow!
}
