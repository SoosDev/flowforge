const DOT_COLORS: Record<string, string> = {
  active: 'bg-green-400',
  stalled: 'bg-yellow-400 animate-pulse',
  offline: 'bg-slate-500',
  PENDING: 'bg-slate-500',
  RUNNING: 'bg-blue-400 animate-pulse',
  COMPLETED: 'bg-green-400',
  FAILED: 'bg-red-400',
  RETRYING: 'bg-yellow-400 animate-pulse',
  STALLED: 'bg-orange-400',
  CANCELLED: 'bg-slate-500',
}

export function StatusDot({ status }: { status: string }) {
  const color = DOT_COLORS[status] ?? 'bg-slate-500'
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
}
