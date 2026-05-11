import type { WsEventType, WsEvent } from '@flowforge/shared'

type Listener = (data: string) => void
const clients = new Set<Listener>()

export const broadcaster = {
  addClient(listener: Listener): void {
    clients.add(listener)
  },
  removeClient(listener: Listener): void {
    clients.delete(listener)
  },
  emit(type: WsEventType, payload: unknown): void {
    const event: WsEvent = { type, payload, timestamp: new Date().toISOString() }
    const data = JSON.stringify(event)
    for (const listener of clients) {
      try { listener(data) } catch { /* client disconnected */ }
    }
  },
}
