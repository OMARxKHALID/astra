import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_KV_REST_API_TOKEN;

const redis =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
        retry: {
          retries: 0,
        },
      })
    : null;

const limiters = new Map();

function getLimiter(key, requests, window) {
  const id = `${key}:${requests}:${window}`;
  if (!limiters.has(id)) {
    limiters.set(
      id,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(requests, window),
        prefix: `rl:astra:${key}`,
        // [Note] ephemeral cache reduces Redis round-trips for burst traffic
        ephemeralCache: new Map(),
      }),
    );
  }
  return limiters.get(id);
}

function getClientIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous"
  );
}

export async function withRateLimit(request, { key, requests, window }) {
  if (!redis) return null;

  const limiter = getLimiter(key, requests, window);
  const ip = getClientIp(request);
  const { success, limit, remaining, reset } = await limiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      { success: false, error: { message: "Too many requests", code: "RATE_LIMITED", status: 429 } },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
        },
      },
    );
  }

  return null;
}
