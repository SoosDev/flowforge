import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import { env } from './config.js'
import { runMigrations } from '@flowforge/shared/db/migrate'
import { authRoutes } from './auth/routes.js'
import { workflowRoutes } from './workflows/routes.js'
import { runRoutes } from './runs/routes.js'
import { workerRoutes } from './workers/routes.js'
import { logRoutes } from './logs/routes.js'
import { setupWebSocket } from './websocket/server.js'
import { startStallDetector } from './workers/stall-detector.js'

const server = Fastify({ logger: true })

await server.register(cors, { origin: true })
await server.register(jwt, { secret: env.JWT_SECRET })
await server.register(websocket)

server.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

await server.register(authRoutes, { prefix: '/auth' })
await server.register(workflowRoutes, { prefix: '/workflows' })
await server.register(runRoutes, { prefix: '/runs' })
await server.register(workerRoutes, { prefix: '/workers' })
await server.register(logRoutes, { prefix: '/logs' })

setupWebSocket(server)

await runMigrations(env.DATABASE_URL)
await server.listen({ port: env.PORT, host: '0.0.0.0' })
startStallDetector()
