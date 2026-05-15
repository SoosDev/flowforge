const API_BASE = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3001'

export const WS_URL = `${API_BASE.replace(/^http/, 'ws')}/ws`

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>
    throw new Error((body['error'] as string | undefined) ?? res.statusText)
  }
  return res.json() as Promise<T>
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: { id: string; email: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string) =>
      request<{ token: string; user: { id: string; email: string } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
  },
  workflows: {
    list: () => request<WorkflowRow[]>('/workflows'),
    get: (id: string) => request<WorkflowWithRuns>(`/workflows/${id}`),
    create: (body: { name: string; description?: string; definition: unknown }) =>
      request<WorkflowRow>('/workflows', { method: 'POST', body: JSON.stringify(body) }),
  },
  runs: {
    start: (workflowId: string, input?: unknown) =>
      request<{ runId: string }>('/runs', { method: 'POST', body: JSON.stringify({ workflowId, input }) }),
    get: (id: string) => request<RunWithTasks>(`/runs/${id}`),
    metrics: () => request<QueueMetrics>('/runs/queue/metrics'),
  },
  workers: {
    list: () => request<WorkerRow[]>('/workers'),
  },
  logs: {
    forTask: (taskRunId: string) => request<LogRow[]>(`/logs/task-runs/${taskRunId}`),
  },
}

export interface WorkflowRow {
  id: string
  name: string
  description: string | null
  version: number
  createdAt: string
  definition: { tasks: Array<{ id: string; type: string; dependsOn?: string[] }> }
}

export interface WorkflowWithRuns extends WorkflowRow {
  runs: RunRow[]
}

export interface RunRow {
  id: string
  workflowId: string
  status: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export interface TaskRunRow {
  id: string
  taskId: string
  taskType: string
  status: string
  attempt: number
  startedAt: string | null
  completedAt: string | null
  error: string | null
}

export interface RunWithTasks extends RunRow {
  taskRuns: TaskRunRow[]
}

export interface WorkerRow {
  id: string
  hostname: string
  pid: number
  status: string
  lastHeartbeatAt: string
}

export interface LogRow {
  id: string
  taskRunId: string
  level: string
  message: string
  createdAt: string
}

export interface QueueMetrics {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}
