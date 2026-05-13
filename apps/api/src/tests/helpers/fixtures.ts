import { testDb } from './db.js'
import { users, workflows } from '@flowforge/shared/db/schema'
import { hashPassword } from '../../auth/service.js'
import type { WorkflowDefinition } from '@flowforge/shared'

export async function createTestUser(email = 'test@example.com') {
  const passwordHash = await hashPassword('password123')
  const [user] = await testDb.insert(users).values({ email, passwordHash }).returning()
  return user!
}

export async function createTestWorkflow(userId: string, definition: WorkflowDefinition) {
  const [workflow] = await testDb.insert(workflows).values({
    userId,
    name: definition.name,
    definition,
  }).returning()
  return workflow!
}
