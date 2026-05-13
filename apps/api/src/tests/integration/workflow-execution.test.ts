import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { testDb, cleanDb } from '../helpers/db.js'
import { createTestUser, createTestWorkflow } from '../helpers/fixtures.js'
import { waitForRunCompletion } from '../helpers/wait.js'
import { startTestWorker } from '../helpers/worker.js'
import { startRun, onTaskCompleted, onTaskFailed } from '../../runs/engine.js'
import { workflowRuns, taskRuns } from '@flowforge/shared/db/schema'
import { WorkflowStatus, TaskStatus } from '@flowforge/shared'
import type { Worker } from 'bullmq'

let testWorker: Worker

beforeEach(async () => {
  await cleanDb()
  testWorker?.close()
  testWorker = startTestWorker(
    {
      'notify-complete': async () => ({ notified: true }),
    },
    async (taskRunId, output) => onTaskCompleted(taskRunId, output),
    async () => {},
  )
})

afterAll(async () => {
  await testWorker?.close()
})

describe('linear pipeline', () => {
  it('executes tasks in dependency order and marks workflow COMPLETED', async () => {
    const user = await createTestUser()
    const workflow = await createTestWorkflow(user.id, {
      name: 'linear',
      tasks: [
        { id: 'a', type: 'notify-complete' },
        { id: 'b', type: 'notify-complete', dependsOn: ['a'] },
        { id: 'c', type: 'notify-complete', dependsOn: ['b'] },
      ],
    })

    const runId = await startRun(workflow.id, {})
    await waitForRunCompletion(runId)

    const run = await testDb.query.workflowRuns.findFirst({
      where: eq(workflowRuns.id, runId),
      with: { taskRuns: true },
    })

    expect(run?.status).toBe(WorkflowStatus.COMPLETED)
    expect(run?.taskRuns).toHaveLength(3)
    expect(run?.taskRuns.every((tr) => tr.status === TaskStatus.COMPLETED)).toBe(true)
    expect(run?.completedAt).not.toBeNull()
  })
})

describe('diamond DAG', () => {
  it('executes parallel branches and completes when all converge', async () => {
    const user = await createTestUser()
    const workflow = await createTestWorkflow(user.id, {
      name: 'diamond',
      tasks: [
        { id: 'root', type: 'notify-complete' },
        { id: 'left', type: 'notify-complete', dependsOn: ['root'] },
        { id: 'right', type: 'notify-complete', dependsOn: ['root'] },
        { id: 'merge', type: 'notify-complete', dependsOn: ['left', 'right'] },
      ],
    })

    const runId = await startRun(workflow.id, {})
    await waitForRunCompletion(runId)

    const run = await testDb.query.workflowRuns.findFirst({
      where: eq(workflowRuns.id, runId),
      with: { taskRuns: true },
    })

    expect(run?.status).toBe(WorkflowStatus.COMPLETED)
    expect(run?.taskRuns).toHaveLength(4)
  })
})

describe('task failure', () => {
  it('marks workflow FAILED when a task throws', async () => {
    testWorker.close()
    testWorker = startTestWorker(
      {
        'notify-complete': async (data) => {
          if (data.config['shouldFail']) throw new Error('Intentional test failure')
          return { notified: true }
        },
      },
      async (id, out) => onTaskCompleted(id, out),
      async (id, err) => {
        const { onTaskFailed } = await import('../../runs/engine.js')
        await onTaskFailed(id, err)
      },
    )

    const user = await createTestUser()
    const workflow = await createTestWorkflow(user.id, {
      name: 'failing-pipeline',
      tasks: [
        { id: 'ok', type: 'notify-complete' },
        { id: 'bad', type: 'notify-complete', dependsOn: ['ok'], config: { shouldFail: true } },
        { id: 'never', type: 'notify-complete', dependsOn: ['bad'] },
      ],
    })

    const runId = await startRun(workflow.id, {})
    await waitForRunCompletion(runId)

    const run = await testDb.query.workflowRuns.findFirst({
      where: eq(workflowRuns.id, runId),
      with: { taskRuns: true },
    })

    expect(run?.status).toBe(WorkflowStatus.FAILED)
    const neverRun = run?.taskRuns.find((tr) => tr.taskId === 'never')
    expect(neverRun).toBeUndefined()
  })
})

describe('dependency outputs', () => {
  it('passes upstream task output into downstream task input', async () => {
    let receivedInput: unknown
    testWorker.close()
    testWorker = startTestWorker(
      {
        'notify-complete': async (data) => {
          if (data.config['capture']) receivedInput = data.input
          return { value: 42 }
        },
      },
      async (id, out) => onTaskCompleted(id, out),
      async () => {},
    )

    const user = await createTestUser()
    const workflow = await createTestWorkflow(user.id, {
      name: 'output-forwarding',
      tasks: [
        { id: 'producer', type: 'notify-complete' },
        { id: 'consumer', type: 'notify-complete', dependsOn: ['producer'], config: { capture: true } },
      ],
    })

    const runId = await startRun(workflow.id, { runParam: 'hello' })
    await waitForRunCompletion(runId)

    expect((receivedInput as Record<string, unknown>)['producer']).toEqual({ value: 42 })
    expect((receivedInput as Record<string, unknown>)['runParam']).toBe('hello')
  })
})
