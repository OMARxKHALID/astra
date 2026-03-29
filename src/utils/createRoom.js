import { LS_KEYS } from "@/constants/config";
import { ls } from "@/utils/localStorage";

// [Note] Shared room creation flow — used by HomeView, InfoView, WatchPage
// Ensures consistent userId handling, JWT storage, and error propagation.
export async function createRoom(videoUrl) {
  const storedId = ls.get(LS_KEYS.userId);
  const userId = storedId || crypto.randomUUID();
  if (!storedId) ls.set(LS_KEYS.userId, userId);

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
