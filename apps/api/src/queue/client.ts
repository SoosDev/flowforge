import { Queue } from 'bullmq'
import { redisConnection } from './connection.js'
import type { JobPayload } from '@flowforge/shared'

interface EnqueueOptions {
  delay?: number
  priority?: number
}

export interface QueueMetrics {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}

interface QueueClient {
  enqueue(data: JobPayload, options?: EnqueueOptions): Promise<string>
  getMetrics(): Promise<QueueMetrics>
}

const queue = new Queue('workflow-tasks', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})

export const queueClient: QueueClient = {
  async enqueue(data, options = {}) {
    const job = await queue.add('execute-task', data, options)
    return job.id!
  },
  async getMetrics() {
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')
    return {
      waiting: counts['waiting'] ?? 0,
      active: counts['active'] ?? 0,
      completed: counts['completed'] ?? 0,
      failed: counts['failed'] ?? 0,
      delayed: counts['delayed'] ?? 0,
    }
  },
}
