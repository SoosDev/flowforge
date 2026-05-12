import OpenAI from 'openai'
import { registerTask } from '../registry.js'
import { env } from '../config.js'

interface Input {
  chunk: { chunks: string[] }
}

interface Output {
  embeddings: number[][]
}

registerTask<Input, Output>({
  type: 'generate-embeddings',
  async execute(ctx) {
    const chunks = ctx.input.chunk?.chunks ?? []
    await ctx.log('info', `Generating embeddings for ${chunks.length} chunks`)

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunks,
    })

    const embeddings = response.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding)

    await ctx.log('info', `Generated ${embeddings.length} embeddings (dim: ${embeddings[0]?.length ?? 0})`)
    return { embeddings }
  },
})