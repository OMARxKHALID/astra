import { Redis } from "@upstash/redis";
import pkg from "@next/env";

const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_KV_REST_API_TOKEN;

export const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

if (!redis) {
  console.warn(`[redis] Not configured — room state will not persist`);
}
