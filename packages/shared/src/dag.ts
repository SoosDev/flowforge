import type { TaskDefinition } from './types/workflow.js'

export function validateDAG(tasks: TaskDefinition[]): void {
  const ids = new Set(tasks.map((t) => t.id))
  for (const task of tasks) {
    for (const dep of task.dependsOn ?? []) {
      if (!ids.has(dep)) {
        throw new Error(`Task "${task.id}" depends on unknown task "${dep}"`)
      }
    }
  }
  detectCycle(tasks)
}

function detectCycle(tasks: TaskDefinition[]): void {
  const state = new Map<string, 'unvisited' | 'visiting' | 'visited'>()
  for (const t of tasks) state.set(t.id, 'unvisited')
  const adj = new Map<string, string[]>()
  for (const t of tasks) adj.set(t.id, t.dependsOn ?? [])

  const dfs = (id: string): void => {
    state.set(id, 'visiting')
    for (const dep of adj.get(id) ?? []) {
      if (state.get(dep) === 'visiting') {
        throw new Error(`Cycle detected involving task "${id}"`)
      }
      if (state.get(dep) === 'unvisited') dfs(dep)
    }
    state.set(id, 'visited')
  }

  for (const t of tasks) {
    if (state.get(t.id) === 'unvisited') dfs(t.id)
  }
}

export function getReadyTasks(tasks: TaskDefinition[], completedIds: Set<string>): string[] {
  return tasks
    .filter((t) => !completedIds.has(t.id))
    .filter((t) => (t.dependsOn ?? []).every((dep) => completedIds.has(dep)))
    .map((t) => t.id)
}

export function topologicalSort(tasks: TaskDefinition[]): TaskDefinition[] {
  validateDAG(tasks)
  const result: TaskDefinition[] = []
  const visited = new Set<string>()
  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  const visit = (id: string): void => {
    if (visited.has(id)) return
    visited.add(id)
    const task = taskMap.get(id)!
    for (const dep of task.dependsOn ?? []) visit(dep)
    result.push(task)
  }

  for (const t of tasks) visit(t.id)
  return result
}
