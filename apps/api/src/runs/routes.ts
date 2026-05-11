import type { FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../auth/middleware.js'
import { startRun } from './engine.js'
import { db } from '../db/client.js'
import { workflowRuns } from '@flowforge/shared/db/schema'
import { eq } from 'drizzle-orm'
import { queueClient } from '../queue/client.js'

export const runRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', requireAuth)

  fastify.post<{ Body: { workflowId: string; input?: unknown } }>('/', async (req) => {
    const runId = await startRun(req.body.workflowId, req.body.input ?? {})
    return { runId }
  })

  fastify.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const run = await db.query.workflowRuns.findFirst({
      where: eq(workflowRuns.id, req.params.id),
      with: { taskRuns: { with: { logs: { orderBy: (l, { asc }) => [asc(l.createdAt)] } } } },
    })
    if (!run) return reply.status(404).send({ error: 'Not found' })
    return run
  })

  fastify.get('/queue/metrics', async () => queueClient.getMetrics())
}
