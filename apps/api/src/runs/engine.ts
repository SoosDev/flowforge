import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { workflows, workflowRuns, taskRuns } from '@flowforge/shared/db/schema'
import { validateDAG, getReadyTasks, TaskStatus, WorkflowStatus } from '@flowforge/shared'
import type { TaskDefinition } from '@flowforge/shared'
import { queueClient } from '../queue/client.js'
import { broadcaster } from '../websocket/broadcaster.js'

export async function startRun(workflowId: string, input: unknown): Promise<string> {
  const workflow = await db.query.workflows.findFirst({
    where: eq(workflows.id, workflowId),
  })
  if (!workflow) throw new Error(`Workflow ${workflowId} not found`)

  validateDAG(workflow.definition.tasks)

  const [run] = await db.insert(workflowRuns).values({
    workflowId,
    status: WorkflowStatus.RUNNING,
    input: input as Record<string, unknown>,
    startedAt: new Date(),
  }).returning()

  broadcaster.emit('workflow.run.started', { runId: run!.id, workflowId })

  const readyTaskIds = getReadyTasks(workflow.definition.tasks, new Set())
  await enqueueTaskBatch(run!.id, workflow.definition.tasks, readyTaskIds, input, [])

  return run!.id
}

export async function onTaskCompleted(taskRunId: string, output: unknown): Promise<void> {
  const taskRun = await db.query.taskRuns.findFirst({ where: eq(taskRuns.id, taskRunId) })
  if (!taskRun) return

  await db.update(taskRuns).set({
    status: TaskStatus.COMPLETED,
    completedAt: new Date(),
    output: output as Record<string, unknown>,
  }).where(eq(taskRuns.id, taskRunId))

  broadcaster.emit('task.run.completed', { taskRunId, workflowRunId: taskRun.workflowRunId })
  await advanceWorkflow(taskRun.workflowRunId)
}

export async function onTaskFailed(taskRunId: string, error: string): Promise<void> {
  const taskRun = await db.query.taskRuns.findFirst({ where: eq(taskRuns.id, taskRunId) })
  if (!taskRun) return

  await db.update(taskRuns).set({
    status: TaskStatus.FAILED,
    completedAt: new Date(),
    error,
  }).where(eq(taskRuns.id, taskRunId))

  broadcaster.emit('task.run.failed', { taskRunId, workflowRunId: taskRun.workflowRunId, error })
  await advanceWorkflow(taskRun.workflowRunId)
}

async function advanceWorkflow(workflowRunId: string): Promise<void> {
  const run = await db.query.workflowRuns.findFirst({
    where: eq(workflowRuns.id, workflowRunId),
    with: { workflow: true, taskRuns: true },
  })
  if (!run || run.status === WorkflowStatus.COMPLETED || run.status === WorkflowStatus.FAILED) return

  const completedIds = new Set(
    run.taskRuns.filter((tr) => tr.status === TaskStatus.COMPLETED).map((tr) => tr.taskId),
  )
  const failedIds = new Set(
    run.taskRuns.filter((tr) => tr.status === TaskStatus.FAILED).map((tr) => tr.taskId),
  )

  if (failedIds.size > 0) {
    await db.update(workflowRuns)
      .set({ status: WorkflowStatus.FAILED, completedAt: new Date() })
      .where(eq(workflowRuns.id, workflowRunId))
    broadcaster.emit('workflow.run.failed', { workflowRunId })
    return
  }

  const allTasks = run.workflow.definition.tasks
  if (completedIds.size === allTasks.length) {
    await db.update(workflowRuns)
      .set({ status: WorkflowStatus.COMPLETED, completedAt: new Date() })
      .where(eq(workflowRuns.id, workflowRunId))
    broadcaster.emit('workflow.run.completed', { workflowRunId })
    return
  }

  const readyTaskIds = getReadyTasks(allTasks, completedIds)
  const enqueuedIds = new Set(run.taskRuns.map((tr) => tr.taskId))
  const newTaskIds = readyTaskIds.filter((id) => !enqueuedIds.has(id))

  await enqueueTaskBatch(workflowRunId, allTasks, newTaskIds, run.input, run.taskRuns)
}

async function enqueueTaskBatch(
  workflowRunId: string,
  allTasks: TaskDefinition[],
  taskIds: string[],
  runInput: unknown,
  completedRuns: Array<{ taskId: string; output: unknown }>,
): Promise<void> {
  const depOutputsByTaskId = Object.fromEntries(
    completedRuns.map((tr) => [tr.taskId, tr.output]),
  )

  for (const taskId of taskIds) {
    const taskDef = allTasks.find((t) => t.id === taskId)!
    const [taskRun] = await db.insert(taskRuns).values({
      workflowRunId,
      taskId,
      taskType: taskDef.type,
      status: TaskStatus.PENDING,
    }).returning()

    const taskInput = {
      ...(runInput as Record<string, unknown>),
      ...depOutputsByTaskId,
    }

    await queueClient.enqueue({
      taskRunId: taskRun!.id,
      workflowRunId,
      taskType: taskDef.type,
      config: taskDef.config ?? {},
      input: taskInput,
    })

    broadcaster.emit('task.run.started', {
      taskRunId: taskRun!.id,
      workflowRunId,
      taskType: taskDef.type,
    })
  }
}
