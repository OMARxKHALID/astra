import { Redis } from "@upstash/redis";

// Support both Upstash's own env var names (UPSTASH_REDIS_REST_*)
// and the Vercel KV / legacy names (REDIS_KV_REST_API_*).
// This mirrors the same dual-format fallback in server/socket.js so the
// Next.js SSR pages and API routes always connect to Redis regardless of
// which env var format is used in .env.local / Vercel dashboard.
const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_KV_REST_API_TOKEN;

if (!redisUrl || !redisToken) {
  console.warn(
    "[roomStore] Redis not configured — room persistence disabled. " +
      "Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN " +
      "(or the REDIS_KV_REST_API_URL / REDIS_KV_REST_API_TOKEN variants).",
  );
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
      await redis.set(`room:${id}`, data, { ex: 86400 });
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
