import type { FastifyPluginAsync } from 'fastify'
import { createUser, findUserByEmail, verifyPassword } from './service.js'

interface AuthBody {
  email: string
  password: string
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: AuthBody }>('/register', async (req, reply) => {
    const { email, password } = req.body
    const existing = await findUserByEmail(email)
    if (existing) return reply.status(409).send({ error: 'Email already registered' })
    const user = await createUser(email, password)
    const token = fastify.jwt.sign({ sub: user.id, email: user.email })
    return { token, user: { id: user.id, email: user.email } }
  })

  fastify.post<{ Body: AuthBody }>('/login', async (req, reply) => {
    const { email, password } = req.body
    const user = await findUserByEmail(email)
    if (!user) return reply.status(401).send({ error: 'Invalid credentials' })
    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' })
    const token = fastify.jwt.sign({ sub: user.id, email: user.email })
    return { token, user: { id: user.id, email: user.email } }
  })
}
