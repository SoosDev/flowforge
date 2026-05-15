import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import type { WorkflowRow } from '../lib/api.js'
import { Nav } from '../components/Nav.js'
import { Card, Badge, Spinner } from '@flowforge/ui'

const AI_DEMO_DEFINITION = {
  name: 'ai-document-ingestion',
  tasks: [
    { id: 'extract', type: 'extract-text' },
    { id: 'chunk', type: 'chunk-text', dependsOn: ['extract'] },
    { id: 'embed', type: 'generate-embeddings', dependsOn: ['chunk'] },
    { id: 'store', type: 'store-vectors', dependsOn: ['chunk', 'embed'] },
    { id: 'done', type: 'notify-complete', dependsOn: ['store'] },
  ],
}

export function Workflows() {
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    setLoading(true)
    const data = await api.workflows.list().catch(() => [])
    setWorkflows(data)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    await api.workflows.create({ name, definition: { ...AI_DEMO_DEFINITION, name } })
    setName('')
    setShowForm(false)
    setCreating(false)
    await load()
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Workflows</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            New workflow
          </button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <form onSubmit={create} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Workflow name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-pipeline"
                  required
                  className="w-full bg-slate-800 border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </form>
            <p className="text-xs text-slate-500 mt-2">Creates an AI document ingestion pipeline (extract to chunk to embed to store).</p>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : workflows.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-12">No workflows yet. Create one above.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {workflows.map((wf) => (
              <Link key={wf.id} to={`/workflows/${wf.id}`}>
                <Card className="hover:border-slate-600 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">{wf.name}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{wf.definition.tasks.length} tasks · v{wf.version}</p>
                    </div>
                    <Badge label={`${wf.definition.tasks.length} tasks`} variant="muted" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
