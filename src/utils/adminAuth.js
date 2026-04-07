import { timingSafeEqual } from "crypto";

export function verifyAdminSecret(token) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || !token || typeof token !== "string") return false;
  try {
    const a = Buffer.from(token, "utf8");
    const b = Buffer.from(secret, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
