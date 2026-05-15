import { useEffect, useRef } from 'react'
import { WS_URL } from '../lib/api.js'
import type { WsEvent, WsEventType } from '@flowforge/shared'

type Handler = (event: WsEvent) => void

export function useWebSocket(handlers: Partial<Record<WsEventType, Handler>>) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const socket = new WebSocket(WS_URL)

    socket.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data as string) as WsEvent
        const handler = handlersRef.current[event.type]
        handler?.(event)
      } catch { /* malformed message */ }
    }

    return () => socket.close()
  }, [])
}
