export interface TaskDefinition {
  id: string
  type: string
  dependsOn?: string[]
  config?: Record<string, unknown>
}

export interface WorkflowDefinition {
  name: string
  description?: string
  tasks: TaskDefinition[]
}
