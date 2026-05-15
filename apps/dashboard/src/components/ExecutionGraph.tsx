import { useMemo } from 'react'
import { ReactFlow, Background, Controls, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { TaskNode } from './TaskNode.js'
import type { TaskRunRow } from '../lib/api.js'

interface TaskDef { id: string; dependsOn?: string[] }

interface Props {
  tasks: TaskDef[]
  taskRuns: TaskRunRow[]
}

const nodeTypes = { taskNode: TaskNode }

function layoutNodes(tasks: TaskDef[]): Map<string, { x: number; y: number }> {
  const levels = new Map<string, number>()
  const getLevel = (id: string): number => {
    if (levels.has(id)) return levels.get(id)!
    const task = tasks.find((t) => t.id === id)!
    const level = task.dependsOn?.length
      ? Math.max(...task.dependsOn.map(getLevel)) + 1
      : 0
    levels.set(id, level)
    return level
  }
  tasks.forEach((t) => getLevel(t.id))

  const byLevel = new Map<number, string[]>()
  for (const [id, level] of levels) {
    if (!byLevel.has(level)) byLevel.set(level, [])
    byLevel.get(level)!.push(id)
  }

  const positions = new Map<string, { x: number; y: number }>()
  for (const [level, ids] of byLevel) {
    ids.forEach((id, i) => {
      positions.set(id, { x: i * 220 - ((ids.length - 1) * 110), y: level * 130 })
    })
  }
  return positions
}

export function ExecutionGraph({ tasks, taskRuns }: Props) {
  const statusMap = new Map(taskRuns.map((tr) => [tr.taskId, tr.status]))
  const positions = useMemo(() => layoutNodes(tasks), [tasks])

  const nodes: Node[] = tasks.map((task) => ({
    id: task.id,
    type: 'taskNode',
    position: positions.get(task.id) ?? { x: 0, y: 0 },
    data: { label: task.id, status: statusMap.get(task.id) ?? 'PENDING' },
  }))

  const edges: Edge[] = tasks.flatMap((task) =>
    (task.dependsOn ?? []).map((dep) => ({
      id: `${dep}-${task.id}`,
      source: dep,
      target: task.id,
      animated: statusMap.get(task.id) === 'RUNNING',
      style: { stroke: '#334155' },
    })),
  )

  return (
    <div style={{ height: 360 }} className="rounded-xl overflow-hidden border border-[var(--color-border)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ background: '#0b1120' }}
      >
        <Background color="#1e2d45" gap={24} />
        <Controls />
      </ReactFlow>
    </div>
  )
}
