import {
  pgTable, uuid, text, integer, timestamp, jsonb, index, customType,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { WorkflowDefinition } from '../types/workflow.js'

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() { return 'vector(1536)' },
  toDriver(value: number[]): string { return `[${value.join(',')}]` },
  fromDriver(value: string): number[] { return value.slice(1, -1).split(',').map(Number) },
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  definition: jsonb('definition').$type<WorkflowDefinition>().notNull(),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const workflowRuns = pgTable('workflow_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id),
  status: text('status').notNull().default('PENDING'),
  input: jsonb('input'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('workflow_runs_workflow_id_idx').on(t.workflowId),
  index('workflow_runs_status_idx').on(t.status),
])

export const workers = pgTable('workers', {
  id: uuid('id').primaryKey().defaultRandom(),
  hostname: text('hostname').notNull(),
  pid: integer('pid').notNull(),
  status: text('status').notNull().default('active'),
  lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }).notNull().defaultNow(),
  registeredAt: timestamp('registered_at', { withTimezone: true }).notNull().defaultNow(),
})

export const taskRuns = pgTable('task_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowRunId: uuid('workflow_run_id').notNull().references(() => workflowRuns.id, { onDelete: 'cascade' }),
  taskId: text('task_id').notNull(),
  taskType: text('task_type').notNull(),
  status: text('status').notNull().default('PENDING'),
  attempt: integer('attempt').notNull().default(1),
  maxAttempts: integer('max_attempts').notNull().default(3),
  workerId: uuid('worker_id').references(() => workers.id),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  error: text('error'),
  output: jsonb('output'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('task_runs_workflow_run_id_idx').on(t.workflowRunId),
  index('task_runs_status_idx').on(t.status),
  index('task_runs_worker_id_idx').on(t.workerId),
])

export const jobLogs = pgTable('job_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskRunId: uuid('task_run_id').notNull().references(() => taskRuns.id, { onDelete: 'cascade' }),
  level: text('level').notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('job_logs_task_run_id_idx').on(t.taskRunId)])

export const embeddings = pgTable('embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowRunId: uuid('workflow_run_id').notNull().references(() => workflowRuns.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const usersRelations = relations(users, ({ many }) => ({
  workflows: many(workflows),
}))

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  user: one(users, { fields: [workflows.userId], references: [users.id] }),
  runs: many(workflowRuns),
}))

export const workflowRunsRelations = relations(workflowRuns, ({ one, many }) => ({
  workflow: one(workflows, { fields: [workflowRuns.workflowId], references: [workflows.id] }),
  taskRuns: many(taskRuns),
}))

export const workersRelations = relations(workers, ({ many }) => ({
  taskRuns: many(taskRuns),
}))

export const taskRunsRelations = relations(taskRuns, ({ one, many }) => ({
  workflowRun: one(workflowRuns, { fields: [taskRuns.workflowRunId], references: [workflowRuns.id] }),
  worker: one(workers, { fields: [taskRuns.workerId], references: [workers.id] }),
  logs: many(jobLogs),
}))

export const jobLogsRelations = relations(jobLogs, ({ one }) => ({
  taskRun: one(taskRuns, { fields: [jobLogs.taskRunId], references: [taskRuns.id] }),
}))
