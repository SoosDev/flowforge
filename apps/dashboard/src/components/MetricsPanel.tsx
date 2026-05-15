import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import type { QueueMetrics } from '../lib/api.js'
import { Card } from '@flowforge/ui'

const METRICS = [
  { key: 'active', label: 'Active', color: 'text-blue-400' },
  { key: 'waiting', label: 'Waiting', color: 'text-slate-300' },
  { key: 'completed', label: 'Completed', color: 'text-green-400' },
  { key: 'failed', label: 'Failed', color: 'text-red-400' },
  { key: 'delayed', label: 'Delayed', color: 'text-yellow-400' },
] as const

export function MetricsPanel() {
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null)

  useEffect(() => {
    const load = () => void api.runs.metrics().then(setMetrics).catch(() => null)
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [])

  if (!metrics) return null

  return (
    <Card className="mb-6">
      <h2 className="text-sm font-semibold text-slate-300 mb-4">Queue Metrics</h2>
      <div className="grid grid-cols-5 gap-4">
        {METRICS.map(({ key, label, color }) => (
          <div key={key} className="text-center">
            <div className={`text-2xl font-bold ${color}`}>{metrics[key]}</div>
            <div className="text-slate-500 text-xs mt-1">{label}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}
