import { LS_KEYS } from "@/constants/config";
import { ls } from "@/utils/localStorage";

// [Note] Shared room creation flow — used by HomeView, InfoView, WatchPage
// Supports both authenticated (session-based) and anonymous (localStorage) users.
// When a session is available, uses the authenticated user's ID for host identity.
export async function createRoom(videoUrl, session = null) {
  // Prefer authenticated user ID, fall back to anonymous localStorage ID
  let userId;
  if (session?.user?.id) {
    userId = session.user.id;
  } else {
    const storedId = ls.get(LS_KEYS.userId);
    userId =
      storedId ||
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `guest-${Math.random().toString(36).slice(2, 11)}-${Date.now().toString(36)}`);
    if (!storedId) ls.set(LS_KEYS.userId, userId);
  }

  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoUrl, userId }),
  });

  const data = await res.json();
  if (!data.roomId || !data.hostToken) throw new Error("Room creation failed");

  ls.set(`host_${data.roomId}`, data.hostToken);
  return { roomId: data.roomId, hostToken: data.hostToken };
}
