import { LS_KEYS } from "@/constants/config";
import { ls } from "@/utils/localStorage";

export function createRoom(videoUrl, session = null) {
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

  const roomId = randomId();

  // Fire-and-forget (mostly): Background registration
  const createPromise = fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoUrl, userId, roomId }),
  }).then(async (res) => {
    const data = await res.json();
    if (data.hostToken) {
      ls.set(`host_${roomId}`, data.hostToken);
      return data;
    }
  });

  return { roomId, createPromise };
}

function randomId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}
