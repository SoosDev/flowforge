import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import type { RunWithTasks } from '../lib/api.js'
import { Nav } from '../components/Nav.js'
import { ExecutionGraph } from '../components/ExecutionGraph.js'
import { useWebSocket } from '../hooks/useWebSocket.js'
import { Card, Badge, Spinner } from '@flowforge/ui'

function statusVariant(s: string): 'success' | 'danger' | 'info' | 'warning' | 'muted' {
  if (s === 'COMPLETED') return 'success'
  if (s === 'FAILED') return 'danger'
  if (s === 'RUNNING') return 'info'
  if (s === 'RETRYING') return 'warning'
  return 'muted'
}

export function RunDetail() {
  const { id } = useParams<{ id: string }>()
  const [run, setRun] = useState<RunWithTasks | null>(null)

  const refresh = useCallback(async () => {
    if (!id) return
    const data = await api.runs.get(id).catch(() => null)
    if (data) setRun(data)
  }, [id])

  useEffect(() => { void refresh() }, [refresh])

  useWebSocket({
    'task.run.started': refresh,
    'task.run.completed': refresh,
    'task.run.failed': refresh,
    'task.run.retrying': refresh,
    'task.run.stalled': refresh,
    'workflow.run.completed': refresh,
    'workflow.run.failed': refresh,
  })

  if (!run) return <div className="min-h-screen"><Nav /><div className="flex justify-center py-12"><Spinner /></div></div>

  const tasks = run.taskRuns.length > 0
    ? run.taskRuns.map((tr) => ({ id: tr.taskId, dependsOn: [] }))
    : []

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-slate-400 text-xs mb-1">
          <Link to="/workflows" className="hover:text-white">Workflows</Link> / Run
        </p>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white font-mono">{run.id.slice(0, 12)}...</h1>
          <Badge label={run.status} variant={statusVariant(run.status)} />
        </div>

        <Card className="mb-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Execution Graph</h2>
          <ExecutionGraph tasks={tasks} taskRuns={run.taskRuns} />
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Task Runs</h2>
          <div className="flex flex-col gap-2">
            {run.taskRuns.map((tr) => (
              <div key={tr.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/40">
                <div>
                  <span className="text-white text-sm font-medium">{tr.taskId}</span>
                  <span className="text-slate-500 text-xs ml-2">{tr.taskType}</span>
                </div>
                <div className="flex items-center gap-3">
                  {tr.attempt > 1 && <span className="text-yellow-400 text-xs">attempt {tr.attempt}</span>}
                  <Badge label={tr.status} variant={statusVariant(tr.status)} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
