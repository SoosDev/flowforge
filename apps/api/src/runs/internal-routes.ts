import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { onTaskCompleted, onTaskFailed } from './engine.js'
import { env } from '../config.js'

async function verifyWorkerSecret(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (req.headers['x-worker-secret'] !== env.WORKER_SECRET) {
    await reply.status(403).send({ error: 'Forbidden' })
  }
}

export const internalRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', verifyWorkerSecret)

  fastify.post<{ Params: { id: string }; Body: { output: unknown } }>(
    '/task-runs/:id/complete',
    async (req) => {
      await onTaskCompleted(req.params.id, req.body.output)
      return { ok: true }
    },
  )

  fastify.post<{ Params: { id: string }; Body: { error: string } }>(
    '/task-runs/:id/fail',
    async (req) => {
      await onTaskFailed(req.params.id, req.body.error)
      return { ok: true }
    },
  )
}