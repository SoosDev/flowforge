import { TaskStatus, WorkflowStatus } from '@flowforge/shared'

const TASK_TRANSITIONS: Record<TaskStatus, ReadonlySet<TaskStatus>> = {
  [TaskStatus.PENDING]:   new Set([TaskStatus.RUNNING, TaskStatus.CANCELLED]),
  [TaskStatus.RUNNING]:   new Set([TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.STALLED]),
  [TaskStatus.WAITING]:   new Set([TaskStatus.RUNNING, TaskStatus.CANCELLED]),
  [TaskStatus.STALLED]:   new Set([TaskStatus.RETRYING, TaskStatus.FAILED]),
  [TaskStatus.RETRYING]:  new Set([TaskStatus.RUNNING, TaskStatus.FAILED]),
  [TaskStatus.COMPLETED]: new Set(),
  [TaskStatus.FAILED]:    new Set(),
  [TaskStatus.CANCELLED]: new Set(),
}

const WORKFLOW_TRANSITIONS: Record<WorkflowStatus, ReadonlySet<WorkflowStatus>> = {
  [WorkflowStatus.PENDING]:   new Set([WorkflowStatus.RUNNING, WorkflowStatus.CANCELLED]),
  [WorkflowStatus.RUNNING]:   new Set([WorkflowStatus.COMPLETED, WorkflowStatus.FAILED, WorkflowStatus.CANCELLED]),
  [WorkflowStatus.COMPLETED]: new Set(),
  [WorkflowStatus.FAILED]:    new Set(),
  [WorkflowStatus.CANCELLED]: new Set(),
}

export function canTaskTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_TRANSITIONS[from]?.has(to) ?? false
}

export function canWorkflowTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  return WORKFLOW_TRANSITIONS[from]?.has(to) ?? false
}

export function assertTaskTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTaskTransition(from, to)) {
    throw new Error(`Invalid task status transition: ${from} → ${to}`)
  }
}

export function assertWorkflowTransition(from: WorkflowStatus, to: WorkflowStatus): void {
  if (!canWorkflowTransition(from, to)) {
    throw new Error(`Invalid workflow status transition: ${from} → ${to}`)
  }
}
