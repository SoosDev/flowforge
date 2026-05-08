type Status = 'pending' | 'running' | 'completed' | 'failed' | 'retrying' | 'stalled' | 'cancelled' | 'waiting'

interface StatusDotProps {
  status: Status
}

const statusColors: Record<Status, string> = {
  pending: 'bg-gray-400',
  running: 'bg-blue-500 animate-pulse',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  retrying: 'bg-yellow-500 animate-pulse',
  stalled: 'bg-orange-500',
  cancelled: 'bg-gray-500',
  waiting: 'bg-purple-400',
}

export function StatusDot({ status }: StatusDotProps) {
  return (
    <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusColors[status]}`} />
  )
}
