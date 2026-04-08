import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_KV_REST_API_TOKEN;

export const redisCache = redisUrl && redisToken
  ? new Redis({
      url: redisUrl,
      token: redisToken,
      retry: {
        retries: 0,
      },
    })
  : null;
