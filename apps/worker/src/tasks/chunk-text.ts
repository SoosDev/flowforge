import { registerTask } from '../registry.js'

interface Input {
  extract: { text: string }
}

interface Output {
  chunks: string[]
}

function chunkText(text: string, maxChunkSize = 400): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 20)
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim())
      current = sentence
    } else {
      current += (current ? ' ' : '') + sentence
    }
  }
  if (current.trim()) chunks.push(current.trim())

  return chunks.slice(0, 50)
}

registerTask<Input, Output>({
  type: 'chunk-text',
  async execute(ctx) {
    const text = ctx.input.extract?.text ?? ''
    await ctx.log('info', `Chunking ${text.length} characters of text`)
    const chunks = chunkText(text)
    await ctx.log('info', `Created ${chunks.length} chunks`)
    return { chunks }
  },
})