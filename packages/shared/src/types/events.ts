export type WsEventType =
  | 'workflow.run.started'
  | 'workflow.run.completed'
  | 'workflow.run.failed'
  | 'task.run.started'
  | 'task.run.completed'
  | 'task.run.failed'
  | 'task.run.retrying'
  | 'task.run.stalled'
  | 'worker.registered'
  | 'worker.stalled'
  | 'worker.offline'
  | 'log.created'

export interface WsEvent<T = unknown> {
  type: WsEventType
  payload: T
  timestamp: string
}
