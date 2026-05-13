import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { runMigrations } from '@flowforge/shared/db/migrate'

const execAsync = promisify(exec)

export async function setup(): Promise<void> {
  await execAsync('docker compose -f docker-compose.test.yml up -d --wait')
  await new Promise((r) => setTimeout(r, 2000))
  await runMigrations('postgresql://flowforge:flowforge@localhost:5433/flowforge_test')
}

export async function teardown(): Promise<void> {
  await execAsync('docker compose -f docker-compose.test.yml down')
}
