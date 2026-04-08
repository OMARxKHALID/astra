"use server";

import { cookies } from "next/headers";

// [Note] Client Cookie Pattern: Generic preference setter for SSR-safe initial load
export async function setPreference(key, value, options = {}) {
  const cookieStore = await cookies();

  cookieStore.set(key, value, {
    httpOnly: false, // [Note] Client Read: Allow client-side reading for immediate feedback
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    ...options,
  });
}

export async function removePreference(key) {
  const cookieStore = await cookies();
  cookieStore.delete(key);
}
