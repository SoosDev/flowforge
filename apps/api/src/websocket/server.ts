import type { FastifyInstance } from 'fastify'
import { broadcaster } from './broadcaster.js'

export function setupWebSocket(fastify: FastifyInstance): void {
  fastify.get('/ws', { websocket: true }, (socket) => {
    const listener = (data: string) => socket.send(data)
    broadcaster.addClient(listener)
    socket.on('close', () => broadcaster.removeClient(listener))
  })
}
