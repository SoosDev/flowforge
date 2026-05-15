import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import { trace } from '@opentelemetry/api'
import { db } from './db/client.js'
import { taskRuns } from '@flowforge/shared/db/schema'
import { TaskStatus } from '@flowforge/shared'
import type { JobPayload } from '@flowforge/shared'
import { getHandler, makeLogger } from './registry.js'
import { redisConnection } from './queue/connection.js'
import { getWorkerId } from './heartbeat.js'
import { env } from './config.js'

const tracer = trace.getTracer('flowforge-worker')

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

      return tracer.startActiveSpan(`task.execute.${taskType}`, async (span) => {
        span.setAttribute('task.run.id', taskRunId)
        span.setAttribute('task.type', taskType)
        span.setAttribute('workflow.run.id', workflowRunId)
        try {
          const output = await handler.execute({ taskRunId, workflowRunId, input, config, log })
          span.setAttribute('task.success', true)
          await log('info', `Completed task: ${taskType}`)
          await notifyApi(`/internal/task-runs/${taskRunId}/complete`, { output })
          return output
        } catch (err) {
          span.recordException(err as Error)
          span.setAttribute('task.success', false)
          throw err
        } finally {
          span.end()
        }
      })
    },
    {
      connection: redisConnection,
      concurrency: 5,
    },
  )
}

export function attachFailureHandler(worker: Worker): void {
  worker.on('failed', async (job, err) => {
    if (!job) return
    const { taskRunId } = job.data as JobPayload
    if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
      await notifyApi(`/internal/task-runs/${taskRunId}/fail`, {
        error: err.message ?? 'Unknown error',
      })
    }
  })
}