import { describe, it, expect, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { testDb, cleanDb } from '../helpers/db.js'
import { createTestUser, createTestWorkflow } from '../helpers/fixtures.js'
import { startRun } from '../../runs/engine.js'
import { detectAndRequeueStalled } from '../../workers/stall-detector.js'
import { workers, taskRuns, workflowRuns } from '@flowforge/shared/db/schema'
import { TaskStatus, WorkflowStatus } from '@flowforge/shared'

beforeEach(cleanDb)

describe('stall detection', () => {
  it('marks tasks STALLED when their worker stops heartbeating', async () => {
    const [worker] = await testDb.insert(workers).values({
      hostname: 'ghost-host',
      pid: 99999,
      status: 'active',
      lastHeartbeatAt: new Date(Date.now() - 60_000),
    }).returning()

    const user = await createTestUser()
    const workflow = await createTestWorkflow(user.id, {
      name: 'stall-test',
      tasks: [{ id: 'a', type: 'notify-complete' }],
    })

    const runId = await startRun(workflow.id, {})

    await testDb.update(workflowRuns)
      .set({ status: WorkflowStatus.RUNNING })
      .where(eq(workflowRuns.id, runId))

    await testDb.update(taskRuns)
      .set({ status: TaskStatus.RUNNING, workerId: worker!.id })
      .where(eq(taskRuns.workflowRunId, runId))

    await detectAndRequeueStalled()

    const updatedWorker = await testDb.query.workers.findFirst({
      where: eq(workers.id, worker!.id),
    })
    expect(updatedWorker?.status).toBe('stalled')

    const updatedTask = await testDb.query.taskRuns.findFirst({
      where: eq(taskRuns.workflowRunId, runId),
    })
    expect(updatedTask?.status).toBe(TaskStatus.RETRYING)
    expect(updatedTask?.attempt).toBe(2)
  })

  it('moves task to FAILED after max retries exhausted', async () => {
    const [worker] = await testDb.insert(workers).values({
      hostname: 'ghost-host-2',
      pid: 99998,
      status: 'active',
      lastHeartbeatAt: new Date(Date.now() - 60_000),
    }).returning()

    const user = await createTestUser()
    const workflow = await createTestWorkflow(user.id, {
      name: 'max-retry-test',
      tasks: [{ id: 'a', type: 'notify-complete' }],
    })

    const runId = await startRun(workflow.id, {})

    await testDb.update(taskRuns)
      .set({
        status: TaskStatus.RUNNING,
        workerId: worker!.id,
        attempt: 3,
        maxAttempts: 3,
      })
      .where(eq(taskRuns.workflowRunId, runId))

    await detectAndRequeueStalled()

    const updatedTask = await testDb.query.taskRuns.findFirst({
      where: eq(taskRuns.workflowRunId, runId),
    })
    expect(updatedTask?.status).toBe(TaskStatus.FAILED)
    expect(updatedTask?.error).toMatch(/max retries/i)
  })

  it('does not affect workers with recent heartbeats', async () => {
    const [worker] = await testDb.insert(workers).values({
      hostname: 'healthy-host',
      pid: 12345,
      status: 'active',
      lastHeartbeatAt: new Date(),
    }).returning()

    await detectAndRequeueStalled()

    const updatedWorker = await testDb.query.workers.findFirst({
      where: eq(workers.id, worker!.id),
    })
    expect(updatedWorker?.status).toBe('active')
  })
})

describe('retry backoff', () => {
  it('increments attempt count on each requeue', async () => {
    const [worker] = await testDb.insert(workers).values({
      hostname: 'ghost-host-3',
      pid: 11111,
      status: 'active',
      lastHeartbeatAt: new Date(Date.now() - 60_000),
    }).returning()

    const user = await createTestUser()
    const workflow = await createTestWorkflow(user.id, {
      name: 'backoff-test',
      tasks: [{ id: 'a', type: 'notify-complete' }],
    })

    const runId = await startRun(workflow.id, {})

    await testDb.update(taskRuns)
      .set({ status: TaskStatus.RUNNING, workerId: worker!.id, attempt: 1, maxAttempts: 3 })
      .where(eq(taskRuns.workflowRunId, runId))

    await detectAndRequeueStalled()

    const task = await testDb.query.taskRuns.findFirst({
      where: eq(taskRuns.workflowRunId, runId),
    })
    expect(task?.attempt).toBe(2)
    expect(task?.status).toBe(TaskStatus.RETRYING)
    expect(task?.workerId).toBeNull()
  })
})
