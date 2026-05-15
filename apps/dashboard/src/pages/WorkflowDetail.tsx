import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import type { WorkflowWithRuns } from '../lib/api.js'
import { Nav } from '../components/Nav.js'
import { ExecutionGraph } from '../components/ExecutionGraph.js'
import { Card, Badge, Spinner, StatusDot } from '@flowforge/ui'

function statusVariant(s: string): 'success' | 'danger' | 'info' | 'warning' | 'muted' {
  if (s === 'COMPLETED') return 'success'
  if (s === 'FAILED') return 'danger'
  if (s === 'RUNNING') return 'info'
  if (s === 'RETRYING') return 'warning'
  return 'muted'
}

export function WorkflowDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [workflow, setWorkflow] = useState<WorkflowWithRuns | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!id) return
    void api.workflows.get(id).then(setWorkflow)
  }, [id])

  const startRun = async () => {
    if (!id) return
    setStarting(true)
    const { runId } = await api.runs.start(id, {})
    setStarting(false)
    navigate(`/runs/${runId}`)
  }

  if (!workflow) return <div className="min-h-screen"><Nav /><div className="flex justify-center py-12"><Spinner /></div></div>

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-slate-400 text-xs mb-1"><Link to="/workflows" className="hover:text-white">Workflows</Link> / {workflow.name}</p>
            <h1 className="text-xl font-bold text-white">{workflow.name}</h1>
          </div>
          <button
            onClick={startRun}
            disabled={starting}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {starting ? 'Starting...' : 'Run now'}
          </button>
        </div>

        <Card className="mb-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">DAG Preview</h2>
          <ExecutionGraph tasks={workflow.definition.tasks} taskRuns={[]} />
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Recent runs</h2>
          {workflow.runs.length === 0 ? (
            <p className="text-slate-500 text-sm">No runs yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {workflow.runs.map((run) => (
                <Link key={run.id} to={`/runs/${run.id}`} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-800/60 transition-colors">
                  <div className="flex items-center gap-2">
                    <StatusDot status={run.status} />
                    <span className="text-white text-xs font-mono">{run.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge label={run.status} variant={statusVariant(run.status)} />
                    <span className="text-slate-500 text-xs">{new Date(run.createdAt).toLocaleString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
