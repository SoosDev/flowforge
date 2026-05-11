import type { FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../auth/middleware.js'
import { db } from '../db/client.js'

export const workerRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', requireAuth)

  fastify.get('/', async () =>
    db.query.workers.findMany({
      orderBy: (w, { desc }) => [desc(w.lastHeartbeatAt)],
    }),
  )
}
