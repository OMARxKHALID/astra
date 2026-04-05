import { createHash, createHmac, timingSafeEqual } from "crypto";

function jwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL: JWT_SECRET environment variable is missing. This is required for secure authentication in production.",
      );
    }
    return "astra-dev-fallback-secret-2024";
  }
  return s;
}

export function verifyHostToken(token, expectedRoomId) {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  try {
    const [header, claims, sig] = parts;
    const secret = jwtSecret();

    const expectedSig = createHmac("sha256", secret)
      .update(`${header}.${claims}`)
      .digest("base64url");

    const sigBuffer = Buffer.from(sig, "base64url");
    const expectedSigBuffer = Buffer.from(expectedSig, "base64url");

    if (
      sigBuffer.length !== expectedSigBuffer.length ||
      !timingSafeEqual(sigBuffer, expectedSigBuffer)
    ) {
      return false;
    }

    const payload = JSON.parse(Buffer.from(claims, "base64url").toString());

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }

    if (payload.role !== "host") return false;
    if (expectedRoomId && payload.roomId !== expectedRoomId) return false;

    return { hostId: payload.sub, ...payload };
  } catch (err) {
    console.error(`[auth] Token verification failed: ${err.message}`);
    return false;
  }
}

export function extractHostId(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const claims = parts[1];
    const payload = JSON.parse(Buffer.from(claims, "base64url").toString());
    return payload.sub || null;
  } catch {
    return null;
  }
}

const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "ogg", "mkv", "mov", "avi"]);

export function isStrictVideoUrl(raw) {
  if (!raw || typeof raw !== "string") return false;
  try {
    const url = new URL(raw.trim());
    const pathname = url.pathname.toLowerCase();
    const ext = pathname.split(".").pop();
    return VIDEO_EXTENSIONS.has(ext);
  } catch {
    return false;
  }
}

export function hashPassword(pw) {
  const salt = process.env.ASTRA_SALT || "astra-default-salt-v1";
  return createHash("sha256")
    .update(pw + salt)
    .digest("hex");
}
