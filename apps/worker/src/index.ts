import './tasks/extract-text.js'
import './tasks/chunk-text.js'
import './tasks/generate-embeddings.js'
import './tasks/store-vectors.js'
import './tasks/notify-complete.js'

import { registerWorker, startHeartbeat, deregisterWorker } from './heartbeat.js'
import { startProcessor, attachFailureHandler } from './processor.js'
import { getRegisteredTypes } from './registry.js'

const workerId = await registerWorker()
console.log(`Worker registered: ${workerId}`)
console.log(`Registered task types: ${getRegisteredTypes().join(', ')}`)

startHeartbeat()
const processor = startProcessor()
attachFailureHandler(processor)

console.log('Worker ready — waiting for jobs')

const shutdown = async () => {
  console.log('Shutting down worker...')
  await processor.close()
  await deregisterWorker()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)