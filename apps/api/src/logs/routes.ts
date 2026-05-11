import type { FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../auth/middleware.js'
import { db } from '../db/client.js'
import { jobLogs } from '@flowforge/shared/db/schema'
import { eq } from 'drizzle-orm'

export const logRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', requireAuth)

  fastify.get<{ Params: { taskRunId: string } }>('/task-runs/:taskRunId', async (req) =>
    db.query.jobLogs.findMany({
      where: eq(jobLogs.taskRunId, req.params.taskRunId),
      orderBy: (l, { asc }) => [asc(l.createdAt)],
    }),
  )
}
