import type { FastifyPluginAsync } from 'fastify'
import { requireAuth, getUserId } from '../auth/middleware.js'
import { createWorkflow, getWorkflow, listWorkflows } from './service.js'

export const workflowRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', requireAuth)

  fastify.get('/', async (req) => listWorkflows(getUserId(req)))

  fastify.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const wf = await getWorkflow(req.params.id)
    if (!wf) return reply.status(404).send({ error: 'Not found' })
    return wf
  })

  fastify.post<{ Body: { name: string; description?: string; definition: unknown } }>(
    '/',
    async (req) => createWorkflow(getUserId(req), req.body.name, req.body.description, req.body.definition),
  )
}
