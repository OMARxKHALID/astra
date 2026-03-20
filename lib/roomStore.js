import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.REDIS_KV_REST_API_URL,
  token: process.env.REDIS_KV_REST_API_TOKEN,
});

export const roomStore = {
  async get(id) {
    try {
      const data = await redis.get(`room:${id}`);
      return data;
    } catch {
      return null;
    }
  },

  async set(id, data) {
    try {
      // Rooms expire after 24 hours of inactivity
      await redis.set(`room:${id}`, data, { ex: 86400 });
      return true;
    } catch {
      return false;
    }
  },

  async delete(id) {
    try {
      await redis.del(`room:${id}`);
      return true;
    } catch {
      return false;
    }
  }
};
