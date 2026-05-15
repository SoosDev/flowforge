import { Handle, Position, type NodeProps } from '@xyflow/react'

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-slate-700 border-slate-600 text-slate-300',
  RUNNING: 'bg-blue-900 border-blue-500 text-blue-200 animate-pulse',
  COMPLETED: 'bg-green-900 border-green-500 text-green-200',
  FAILED: 'bg-red-900 border-red-500 text-red-200',
  RETRYING: 'bg-yellow-900 border-yellow-500 text-yellow-200',
  STALLED: 'bg-orange-900 border-orange-500 text-orange-200',
  CANCELLED: 'bg-slate-800 border-slate-600 text-slate-400',
}

export function TaskNode({ data }: NodeProps) {
  const style = STATUS_STYLE[data['status'] as string] ?? STATUS_STYLE['PENDING']!
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-slate-500" />
      <div className={`px-4 py-2.5 rounded-lg border text-center min-w-36 ${style}`}>
        <div className="text-xs font-semibold">{data['label'] as string}</div>
        <div className="text-xs opacity-60 mt-0.5">{data['status'] as string}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
    </>
  )
}
