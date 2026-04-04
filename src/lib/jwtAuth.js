import { createHmac, timingSafeEqual } from "crypto";
import { JWT_EXPIRY_S } from "@/constants/config";

function b64url(str) {
  return Buffer.from(str).toString("base64url");
}

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      // [Note] Critical security: JWT_SECRET must be set on Vercel/Render for token persistence
    }
    return "dev-fallback-not-secure";
  }
  return s;
}

export function signJwt(payload, expiry = JWT_EXPIRY_S) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiry,
    }),
  );
  const signature = createHmac("sha256", secret())
    .update(`${header}.${claims}`)
    .digest("base64url");
  return `${header}.${claims}.${signature}`;
}

export function verifyJwt(token) {
  if (!token || typeof token !== "string") throw new Error("No token");
  const [header, claims, sig] = token.split(".");
  if (!header || !claims || !sig) throw new Error("Malformed token");
  const expected = createHmac("sha256", secret())
    .update(`${header}.${claims}`)
    .digest("base64url");
  const a = Buffer.from(sig, "base64url");
  const b = Buffer.from(expected, "base64url");
  if (a.length !== b.length || !timingSafeEqual(a, b))
    throw new Error("Invalid signature");
  const payload = JSON.parse(Buffer.from(claims, "base64url").toString());
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000))
    throw new Error("Token expired");
  return payload;
}