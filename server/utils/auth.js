import { createHash, createHmac, timingSafeEqual } from "crypto";

function jwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      console.error(`[jwt] JWT_SECRET is not set in production — verification will likely fail`);
    }
    return "dev-fallback-not-secure";
  }
  return s;
}

export function verifyHostToken(token, expectedRoomId) {
  if (!token) return false;

  if (token.includes(".")) {
    try {
      const [header, claims, sig] = token.split(".");
      if (!header || !claims || !sig) return false;
      const expected = createHmac("sha256", jwtSecret())
        .update(`${header}.${claims}`)
        .digest("base64url");
      const a = Buffer.from(sig, "base64url");
      const b = Buffer.from(expected, "base64url");
      if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
      const payload = JSON.parse(Buffer.from(claims, "base64url").toString());
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000))
        return false;
      if (payload.role !== "host") return false;
      if (expectedRoomId && payload.roomId !== expectedRoomId) return false;
      return { hostId: payload.sub, ...payload };
    } catch {
      return false;
    }
  }

  return false;
}

export function extractHostId(token) {
  if (!token?.includes(".")) return null;
  try {
    const claims = token.split(".")[1];
    const payload = JSON.parse(Buffer.from(claims, "base64url").toString());
    return payload.sub || null;
  } catch {
    return null;
  }
}

const STRICT_EXTS = /\.(mp4|webm|ogg|mkv|mov|avi)$/i;
export function isStrictVideoUrl(raw) {
  if (!raw || typeof raw !== "string") return false;
  try {
    return STRICT_EXTS.test(new URL(raw.trim()).pathname.toLowerCase());
  } catch {
    return false;
  }
}

export function hashPassword(pw) {
  return createHash("sha256")
    .update(pw + "wt-salt")
    .digest("hex");
}