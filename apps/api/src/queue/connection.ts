import type { RedisOptions } from 'bullmq'
import { env } from '../config.js'

export const redisConnection: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
}
