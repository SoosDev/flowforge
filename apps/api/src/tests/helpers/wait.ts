import { eq } from 'drizzle-orm'
import { testDb } from './db.js'
import { workflowRuns } from '@flowforge/shared/db/schema'
import { WorkflowStatus } from '@flowforge/shared'

export async function waitForRunCompletion(
  runId: string,
  timeoutMs = 15_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const run = await testDb.query.workflowRuns.findFirst({
      where: eq(workflowRuns.id, runId),
    })
    if (
      run?.status === WorkflowStatus.COMPLETED ||
      run?.status === WorkflowStatus.FAILED
    ) return
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`Run ${runId} did not complete within ${timeoutMs}ms`)
}
