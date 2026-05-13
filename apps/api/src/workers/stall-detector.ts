import { and, eq, lt } from 'drizzle-orm'
import { db } from '../db/client.js'
import { workers, taskRuns } from '@flowforge/shared/db/schema'
import { TaskStatus } from '@flowforge/shared'
import { queueClient } from '../queue/client.js'
import { broadcaster } from '../websocket/broadcaster.js'

const STALL_THRESHOLD_MS = 30_000

export async function detectAndRequeueStalled(): Promise<void> {
  const cutoff = new Date(Date.now() - STALL_THRESHOLD_MS)

  const stalledWorkers = await db.update(workers)
    .set({ status: 'stalled' })
    .where(and(eq(workers.status, 'active'), lt(workers.lastHeartbeatAt, cutoff)))
    .returning()

  for (const worker of stalledWorkers) {
    broadcaster.emit('worker.stalled', { workerId: worker.id })

    const stalledTasks = await db.update(taskRuns)
      .set({ status: TaskStatus.STALLED })
      .where(and(eq(taskRuns.workerId, worker.id), eq(taskRuns.status, TaskStatus.RUNNING)))
      .returning()

    for (const task of stalledTasks) {
      broadcaster.emit('task.run.stalled', { taskRunId: task.id })

      if (task.attempt < task.maxAttempts) {
        const nextAttempt = task.attempt + 1
        await db.update(taskRuns)
          .set({ status: TaskStatus.RETRYING, attempt: nextAttempt, workerId: null })
          .where(eq(taskRuns.id, task.id))

        await queueClient.enqueue(
          {
            taskRunId: task.id,
            workflowRunId: task.workflowRunId,
            taskType: task.taskType,
            config: {},
            input: {},
          },
          { delay: 1000 * Math.pow(2, task.attempt) },
        )
        broadcaster.emit('task.run.retrying', { taskRunId: task.id, attempt: nextAttempt })
      } else {
        await db.update(taskRuns)
          .set({
            status: TaskStatus.FAILED,
            error: 'Max retries exceeded after worker stall',
            completedAt: new Date(),
          })
          .where(eq(taskRuns.id, task.id))
        broadcaster.emit('task.run.failed', {
          taskRunId: task.id,
          error: 'Max retries exceeded after worker stall',
        })
      }
    }
  }
}

export function startStallDetector(intervalMs = 15_000): NodeJS.Timeout {
  return setInterval(detectAndRequeueStalled, intervalMs)
}
