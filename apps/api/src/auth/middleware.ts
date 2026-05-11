import type { FastifyRequest, FastifyReply } from 'fastify'

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await req.jwtVerify()
  } catch {
    await reply.status(401).send({ error: 'Unauthorized' })
  }
}

export function getUserId(req: FastifyRequest): string {
  return (req.user as { sub: string }).sub
}
