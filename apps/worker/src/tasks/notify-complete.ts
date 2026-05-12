import { registerTask } from '../registry.js'

registerTask<Record<string, unknown>, { notified: true }>({
  type: 'notify-complete',
  async execute(ctx) {
    await ctx.log('info', 'Pipeline complete — all steps finished successfully')
    return { notified: true }
  },
})