import { describe, it, expect } from 'vitest'
import { canTaskTransition, canWorkflowTransition, assertTaskTransition } from './state-machine.js'
import { TaskStatus, WorkflowStatus } from '@flowforge/shared'

describe('canTaskTransition', () => {
  it('allows PENDING → RUNNING', () => {
    expect(canTaskTransition(TaskStatus.PENDING, TaskStatus.RUNNING)).toBe(true)
  })
  it('allows RUNNING → COMPLETED', () => {
    expect(canTaskTransition(TaskStatus.RUNNING, TaskStatus.COMPLETED)).toBe(true)
  })
  it('allows RUNNING → STALLED', () => {
    expect(canTaskTransition(TaskStatus.RUNNING, TaskStatus.STALLED)).toBe(true)
  })
  it('allows STALLED → RETRYING', () => {
    expect(canTaskTransition(TaskStatus.STALLED, TaskStatus.RETRYING)).toBe(true)
  })
  it('allows RETRYING → RUNNING', () => {
    expect(canTaskTransition(TaskStatus.RETRYING, TaskStatus.RUNNING)).toBe(true)
  })
  it('rejects COMPLETED → RUNNING', () => {
    expect(canTaskTransition(TaskStatus.COMPLETED, TaskStatus.RUNNING)).toBe(false)
  })
  it('rejects FAILED → RETRYING', () => {
    expect(canTaskTransition(TaskStatus.FAILED, TaskStatus.RETRYING)).toBe(false)
  })
  it('rejects PENDING → COMPLETED directly', () => {
    expect(canTaskTransition(TaskStatus.PENDING, TaskStatus.COMPLETED)).toBe(false)
  })
})

describe('canWorkflowTransition', () => {
  it('allows PENDING → RUNNING', () => {
    expect(canWorkflowTransition(WorkflowStatus.PENDING, WorkflowStatus.RUNNING)).toBe(true)
  })
  it('allows RUNNING → COMPLETED', () => {
    expect(canWorkflowTransition(WorkflowStatus.RUNNING, WorkflowStatus.COMPLETED)).toBe(true)
  })
  it('allows RUNNING → FAILED', () => {
    expect(canWorkflowTransition(WorkflowStatus.RUNNING, WorkflowStatus.FAILED)).toBe(true)
  })
  it('rejects COMPLETED → RUNNING', () => {
    expect(canWorkflowTransition(WorkflowStatus.COMPLETED, WorkflowStatus.RUNNING)).toBe(false)
  })
  it('rejects FAILED → COMPLETED', () => {
    expect(canWorkflowTransition(WorkflowStatus.FAILED, WorkflowStatus.COMPLETED)).toBe(false)
  })
})

describe('assertTaskTransition', () => {
  it('throws with descriptive message on invalid transition', () => {
    expect(() => assertTaskTransition(TaskStatus.COMPLETED, TaskStatus.RUNNING))
      .toThrow(/COMPLETED.*RUNNING/i)
  })
  it('does not throw on valid transition', () => {
    expect(() => assertTaskTransition(TaskStatus.PENDING, TaskStatus.RUNNING)).not.toThrow()
  })
})
