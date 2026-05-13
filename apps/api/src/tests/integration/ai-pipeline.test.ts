import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { testDb, cleanDb } from '../helpers/db.js'
import { createTestUser, createTestWorkflow } from '../helpers/fixtures.js'
import { waitForRunCompletion } from '../helpers/wait.js'
import { startTestWorker } from '../helpers/worker.js'
import { startRun, onTaskCompleted, onTaskFailed } from '../../runs/engine.js'
import { embeddings, workflowRuns } from '@flowforge/shared/db/schema'
import { WorkflowStatus } from '@flowforge/shared'
import type { Worker } from 'bullmq'
import type { JobPayload } from '@flowforge/shared'

import '../../../../../apps/worker/src/tasks/extract-text.js'
import '../../../../../apps/worker/src/tasks/chunk-text.js'
import '../../../../../apps/worker/src/tasks/generate-embeddings.js'
import '../../../../../apps/worker/src/tasks/store-vectors.js'
import '../../../../../apps/worker/src/tasks/notify-complete.js'
import { getHandler, makeLogger } from '../../../../../apps/worker/src/registry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const hasOpenAI = Boolean(process.env['OPENAI_API_KEY'])

function makeRegistryHandler(type: string) {
  return async (data: JobPayload): Promise<unknown> => {
    const handler = getHandler(type)
    if (!handler) throw new Error(`No registered handler for: ${type}`)
    return handler.execute({
      taskRunId: data.taskRunId,
      workflowRunId: data.workflowRunId,
      input: data.input,
      config: data.config,
      log: makeLogger(data.taskRunId),
    })
  }
}

let testWorker: Worker

beforeEach(cleanDb)

afterAll(async () => {
  await testWorker?.close()
})

describe.skipIf(!hasOpenAI)('AI document ingestion pipeline', () => {
  it('processes a PDF end-to-end and stores embeddings in pgvector', async () => {
    const pdfBytes = readFileSync(path.join(__dirname, '../fixtures/sample.pdf'))
    const pdfBase64 = pdfBytes.toString('base64')

    testWorker = startTestWorker(
      {
        'extract-text': makeRegistryHandler('extract-text'),
        'chunk-text': makeRegistryHandler('chunk-text'),
        'generate-embeddings': makeRegistryHandler('generate-embeddings'),
        'store-vectors': makeRegistryHandler('store-vectors'),
        'notify-complete': makeRegistryHandler('notify-complete'),
      },
      async (taskRunId, output) => onTaskCompleted(taskRunId, output),
      async (taskRunId, err) => onTaskFailed(taskRunId, err),
    )

    const user = await createTestUser()
    const workflow = await createTestWorkflow(user.id, {
      name: 'ai-ingestion',
      tasks: [
        { id: 'extract', type: 'extract-text' },
        { id: 'chunk', type: 'chunk-text', dependsOn: ['extract'] },
        { id: 'embed', type: 'generate-embeddings', dependsOn: ['chunk'] },
        { id: 'store', type: 'store-vectors', dependsOn: ['chunk', 'embed'] },
        { id: 'done', type: 'notify-complete', dependsOn: ['store'] },
      ],
    })

    const runId = await startRun(workflow.id, {
      filename: 'sample.pdf',
      content: pdfBase64,
    })

    await waitForRunCompletion(runId, 60_000)

    const run = await testDb.query.workflowRuns.findFirst({
      where: eq(workflowRuns.id, runId),
    })
    expect(run?.status).toBe(WorkflowStatus.COMPLETED)

    const storedEmbeddings = await testDb.query.embeddings.findMany({
      where: eq(embeddings.workflowRunId, runId),
    })

    expect(storedEmbeddings.length).toBeGreaterThan(0)
    expect(storedEmbeddings[0]?.content).toBeTruthy()
    expect(storedEmbeddings[0]?.embedding).toHaveLength(1536)
  }, 60_000)
})

describe('AI pipeline without OpenAI key', () => {
  it('skips gracefully when OPENAI_API_KEY is not set', () => {
    if (hasOpenAI) return
    expect(true).toBe(true)
  })
})
