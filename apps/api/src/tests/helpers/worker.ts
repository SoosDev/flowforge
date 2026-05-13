import { Worker } from 'bullmq'
import type { RedisOptions } from 'bullmq'
import type { JobPayload } from '@flowforge/shared'

const testRedis: RedisOptions = {
  host: 'localhost',
  port: 6380,
  maxRetriesPerRequest: null,
}

export type SimpleHandler = (data: JobPayload) => Promise<unknown>

export function startTestWorker(
  handlers: Record<string, SimpleHandler>,
  onComplete: (taskRunId: string, output: unknown) => Promise<void>,
  onFail: (taskRunId: string, error: string) => Promise<void>,
): Worker {
  return new Worker<JobPayload>(
    'workflow-tasks',
    async (job) => {
      const { taskRunId, taskType } = job.data
      const handler = handlers[taskType]
      if (!handler) throw new Error(`No test handler for: ${taskType}`)
      const output = await handler(job.data)
      await onComplete(taskRunId, output)
      return output
    },
    { connection: testRedis, concurrency: 5 },
  )
}
