import { describe, it, expect } from 'vitest'
import { validateDAG, getReadyTasks, topologicalSort } from './dag.js'
import type { TaskDefinition } from './types/workflow.js'

const task = (id: string, dependsOn: string[] = []): TaskDefinition => ({
  id,
  type: `type-${id}`,
  dependsOn,
})

describe('validateDAG', () => {
  it('accepts a valid linear chain', () => {
    expect(() =>
      validateDAG([task('a'), task('b', ['a']), task('c', ['b'])])
    ).not.toThrow()
  })

  it('accepts a valid diamond shape', () => {
    expect(() =>
      validateDAG([task('a'), task('b', ['a']), task('c', ['a']), task('d', ['b', 'c'])])
    ).not.toThrow()
  })

  it('rejects a direct cycle', () => {
    expect(() => validateDAG([task('a', ['b']), task('b', ['a'])]))
      .toThrow(/cycle/i)
  })

  it('rejects a self-loop', () => {
    expect(() => validateDAG([task('a', ['a'])])).toThrow(/cycle/i)
  })

  it('rejects a reference to an unknown task', () => {
    expect(() => validateDAG([task('a', ['nonexistent'])])).toThrow(/unknown/i)
  })
})

describe('getReadyTasks', () => {
  const tasks = [task('a'), task('b', ['a']), task('c', ['a']), task('d', ['b', 'c'])]

  it('returns only root tasks when nothing is completed', () => {
    expect(getReadyTasks(tasks, new Set())).toEqual(['a'])
  })

  it('unblocks dependents when their deps complete', () => {
    expect(getReadyTasks(tasks, new Set(['a']))).toEqual(expect.arrayContaining(['b', 'c']))
  })

  it('returns the final task when all predecessors complete', () => {
    expect(getReadyTasks(tasks, new Set(['a', 'b', 'c']))).toEqual(['d'])
  })

  it('returns empty when all tasks complete', () => {
    expect(getReadyTasks(tasks, new Set(['a', 'b', 'c', 'd']))).toEqual([])
  })
})

describe('topologicalSort', () => {
  it('orders tasks so each task appears after its dependencies', () => {
    const tasks = [task('d', ['b', 'c']), task('b', ['a']), task('c', ['a']), task('a')]
    const sorted = topologicalSort(tasks)
    const idx = (id: string) => sorted.findIndex((t) => t.id === id)
    expect(idx('a')).toBeLessThan(idx('b'))
    expect(idx('a')).toBeLessThan(idx('c'))
    expect(idx('b')).toBeLessThan(idx('d'))
    expect(idx('c')).toBeLessThan(idx('d'))
  })
})
