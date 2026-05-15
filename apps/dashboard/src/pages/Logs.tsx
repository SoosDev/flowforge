import { Nav } from '../components/Nav.js'
import { Card } from '@flowforge/ui'

export function Logs() {
  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-xl font-bold text-white mb-6">Logs</h1>
        <Card>
          <p className="text-slate-400 text-sm">
            Task logs are shown inline on each Run Detail page. Navigate to a run to see its logs.
          </p>
        </Card>
      </div>
    </div>
  )
}
