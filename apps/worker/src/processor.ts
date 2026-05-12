import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import { db } from './db/client.js'
import { taskRuns } from '@flowforge/shared/db/schema'
import { TaskStatus } from '@flowforge/shared'
import type { JobPayload } from '@flowforge/shared'
import { getHandler, makeLogger } from './registry.js'
import { redisConnection } from './queue/connection.js'
import { getWorkerId } from './heartbeat.js'
import { env } from './config.js'

async function notifyApi(path: string, body: unknown): Promise<void> {
  await fetch(`${env.API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-secret': env.WORKER_SECRET,
    },
    body: JSON.stringify(body),
  })
}

export function startProcessor(): Worker {
  return new Worker<JobPayload>(
    'workflow-tasks',
    async (job) => {
      const { taskRunId, workflowRunId, taskType, config, input } = job.data

      await db.update(taskRuns).set({
        status: TaskStatus.RUNNING,
        workerId: getWorkerId(),
        startedAt: new Date(),
      }).where(eq(taskRuns.id, taskRunId))

      const handler = getHandler(taskType)
      if (!handler) throw new Error(`No handler registered for task type: ${taskType}`)

      const log = makeLogger(taskRunId)
      await log('info', `Starting task: ${taskType}`)

      const output = await handler.execute({
        taskRunId,
        workflowRunId,
        input,
        config,
        log,
      })

      await log('info', `Completed task: ${taskType}`)
      await notifyApi(`/internal/task-runs/${taskRunId}/complete`, { output })

      return output
    },
    {
      connection: redisConnection,
      concurrency: 5,
    },
  )
}