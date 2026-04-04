import { Redis } from "@upstash/redis";
import { REDIS_TTL_S } from "@/constants/config";

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_KV_REST_API_TOKEN;

if (!redisUrl || !redisToken) {
  // persistence disabled — roomStore falls back to in-memory only
}

const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

export const roomStore = {
  async get(id) {
    if (!redis) return null;
    try {
      const data = await redis.get(`room:${id}`);
      return data;
    } catch {
      return null;
    }
  },
  async set(id, data) {
    if (!redis) return false;
    try {
      await redis.set(`room:${id}`, data, { ex: REDIS_TTL_S });
      return true;
    } catch {
      return false;
    }
  },
  async delete(id) {
    if (!redis) return false;
    try {
      await redis.del(`room:${id}`);
      return true;
    } catch {
      return false;
    }
  },
};
