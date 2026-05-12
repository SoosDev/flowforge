function requireEnv(key: string): string {
  const value = process.env[key]
  if (value === undefined || value === '') throw new Error(`Missing required env var: ${key}`)
  return value
}

export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  REDIS_HOST: process.env['REDIS_HOST'] ?? 'localhost',
  REDIS_PORT: parseInt(process.env['REDIS_PORT'] ?? '6379'),
  OPENAI_API_KEY: process.env['OPENAI_API_KEY'] ?? '',
  API_URL: process.env['API_URL'] ?? 'http://localhost:3001',
  WORKER_SECRET: requireEnv('WORKER_SECRET'),
}