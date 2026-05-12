import { registerTask } from '../registry.js'
import { db } from '../db/client.js'
import { embeddings } from '@flowforge/shared/db/schema'

interface Input {
  chunk: { chunks: string[] }
  embed: { embeddings: number[][] }
}

interface Output {
  stored: number
}

registerTask<Input, Output>({
  type: 'store-vectors',
  async execute(ctx) {
    const chunks = ctx.input.chunk?.chunks ?? []
    const vecs = ctx.input.embed?.embeddings ?? []

    await ctx.log('info', `Storing ${chunks.length} vectors in pgvector`)

    const rows = chunks.map((content, i) => ({
      workflowRunId: ctx.workflowRunId,
      chunkIndex: i,
      content,
      embedding: vecs[i] ?? [],
    }))

    await db.insert(embeddings).values(rows)
    await ctx.log('info', `Stored ${rows.length} vectors`)
    return { stored: rows.length }
  },
})