/**
 * Minimal JWT implementation using Node's built-in crypto module.
 * Only supports HS256. No external dependencies.
 *
 * Used for host token signing in app/api/rooms/route.js (Next.js side).
 * The server/socket.js uses jsonwebtoken (separate process, separate deps).
 */
import { createHmac, timingSafeEqual } from "crypto";

function b64url(str) {
  return Buffer.from(str).toString("base64url");
}

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) {
    // In dev: warn once and use a stable-ish fallback.
    // In prod: JWT_SECRET MUST be set — token won't survive server restarts otherwise.
    if (process.env.NODE_ENV === "production")
      console.error(
        "[jwt] JWT_SECRET is not set in production! Host tokens will not be verifiable.",
      );
    return "dev-fallback-not-secure";
  }
  return s;
}

/** Sign a JWT with HS256. Returns the compact token string. */
export function signJwt(payload, expiresInSeconds = 86400) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    }),
  );
  const sig = createHmac("sha256", secret())
    .update(`${header}.${claims}`)
    .digest("base64url");
  return `${header}.${claims}.${sig}`;
}

/** Verify a JWT. Returns the payload or throws on invalid/expired. */
export function verifyJwt(token) {
  if (!token || typeof token !== "string") throw new Error("No token");
  const [header, claims, sig] = token.split(".");
  if (!header || !claims || !sig) throw new Error("Malformed token");
  const expected = createHmac("sha256", secret())
    .update(`${header}.${claims}`)
    .digest("base64url");
  // Constant-time comparison to prevent timing attacks
  const a = Buffer.from(sig, "base64url");
  const b = Buffer.from(expected, "base64url");
  if (a.length !== b.length || !timingSafeEqual(a, b))
    throw new Error("Invalid signature");
  const payload = JSON.parse(Buffer.from(claims, "base64url").toString());
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000))
    throw new Error("Token expired");
  return payload;
}
