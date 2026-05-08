export interface JobPayload {
  taskRunId: string
  workflowRunId: string
  taskType: string
  config: Record<string, unknown>
  input: unknown
}
