import os from 'node:os'
import { eq } from 'drizzle-orm'
import { db } from './db/client.js'
import { workers } from '@flowforge/shared/db/schema'

let workerId: string | null = null
let heartbeatTimer: NodeJS.Timeout | null = null

export async function registerWorker(): Promise<string> {
  const [worker] = await db.insert(workers).values({
    hostname: os.hostname(),
    pid: process.pid,
    status: 'active',
    lastHeartbeatAt: new Date(),
  }).returning()
  workerId = worker!.id
  return workerId
}

export function getWorkerId(): string | null {
  return workerId
}

export function startHeartbeat(intervalMs = 10_000): void {
  heartbeatTimer = setInterval(async () => {
    if (!workerId) return
    await db.update(workers)
      .set({ lastHeartbeatAt: new Date(), status: 'active' })
      .where(eq(workers.id, workerId))
  }, intervalMs)
}

export function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

export async function deregisterWorker(): Promise<void> {
  if (!workerId) return
  stopHeartbeat()
  await db.update(workers).set({ status: 'offline' }).where(eq(workers.id, workerId))
}