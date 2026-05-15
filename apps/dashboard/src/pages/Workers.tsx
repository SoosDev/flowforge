import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api.js'
import type { WorkerRow } from '../lib/api.js'
import { Nav } from '../components/Nav.js'
import { MetricsPanel } from '../components/MetricsPanel.js'
import { useWebSocket } from '../hooks/useWebSocket.js'
import { Card, StatusDot, Badge, Spinner } from '@flowforge/ui'

function workerVariant(s: string): 'success' | 'warning' | 'muted' {
  if (s === 'active') return 'success'
  if (s === 'stalled') return 'warning'
  return 'muted'
}

export function Workers() {
  const [workers, setWorkers] = useState<WorkerRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await api.workers.list().catch(() => [])
    setWorkers(data)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  useWebSocket({
    'worker.registered': load,
    'worker.stalled': load,
    'worker.offline': load,
  })

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-xl font-bold text-white mb-6">Workers</h1>
        <MetricsPanel />
        <Card>
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Worker processes</h2>
          {loading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : workers.length === 0 ? (
            <p className="text-slate-500 text-sm">No workers registered.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {workers.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/40">
                  <div className="flex items-center gap-2">
                    <StatusDot status={w.status} />
                    <span className="text-white text-sm">{w.hostname}</span>
                    <span className="text-slate-500 text-xs">PID {w.pid}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-xs">
                      {new Date(w.lastHeartbeatAt).toLocaleTimeString()}
                    </span>
                    <Badge label={w.status} variant={workerVariant(w.status)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
