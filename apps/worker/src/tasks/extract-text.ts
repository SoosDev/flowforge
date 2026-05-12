import { PDFParse } from 'pdf-parse'
import { registerTask } from '../registry.js'

interface Input {
  filename: string
  content: string
}

interface Output {
  text: string
  pageCount: number
}

registerTask<Input, Output>({
  type: 'extract-text',
  async execute(ctx) {
    await ctx.log('info', `Extracting text from ${ctx.input.filename}`)
    const buffer = Buffer.from(ctx.input.content, 'base64')
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const result = await parser.getText()
    await parser.destroy()
    await ctx.log('info', `Extracted ${result.text.length} characters from ${result.total} pages`)
    return { text: result.text, pageCount: result.total }
  },
})