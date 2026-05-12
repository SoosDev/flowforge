import { db } from './db/client.js'
import { jobLogs } from '@flowforge/shared/db/schema'

export interface TaskContext<TInput = unknown> {
  taskRunId: string
  workflowRunId: string
  input: TInput
  config: Record<string, unknown>
  log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): Promise<void>
}

export interface TaskHandler<TInput = unknown, TOutput = unknown> {
  type: string
  execute(ctx: TaskContext<TInput>): Promise<TOutput>
}

const registry = new Map<string, TaskHandler>()

export function registerTask<TInput, TOutput>(handler: TaskHandler<TInput, TOutput>): void {
  registry.set(handler.type, handler as TaskHandler)
}

export function getHandler(type: string): TaskHandler | undefined {
  return registry.get(type)
}

export function getRegisteredTypes(): string[] {
  return [...registry.keys()]
}

export function makeLogger(taskRunId: string) {
  return async (
    level: 'info' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> => {
    await db.insert(jobLogs).values({ taskRunId, level, message, metadata })
  }
}