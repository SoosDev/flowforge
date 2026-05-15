import type { RedisOptions } from 'bullmq'
import { env } from '../config.js'

function parseRedisUrl(url: string): RedisOptions {
  const parsed = new URL(url)
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379'),
    password: parsed.password || undefined,
    maxRetriesPerRequest: null,
  }
}

export const redisConnection: RedisOptions = process.env['REDIS_URL']
  ? parseRedisUrl(process.env['REDIS_URL'])
  : {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      maxRetriesPerRequest: null,
    }
