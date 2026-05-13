import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/tests/integration/**/*.test.ts'],
    globalSetup: ['src/tests/setup/global.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    sequence: { concurrent: false },
    env: {
      DATABASE_URL: 'postgresql://flowforge:flowforge@localhost:5433/flowforge_test',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6380',
      JWT_SECRET: 'test-secret',
      WORKER_SECRET: 'test-worker-secret',
      API_URL: 'http://localhost:3001',
    },
  },
})
