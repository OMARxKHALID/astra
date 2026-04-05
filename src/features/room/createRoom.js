import { LS_KEYS } from "@/constants/config";
import { ls } from "@/utils/localStorage";
import { generateId, generateGuestId } from "@/utils/id";

export function createRoom(videoUrl, session = null) {
  let userId;
  if (session?.user?.id) {
    userId = session.user.id;
  } else {
    const storedId = ls.get(LS_KEYS.userId);
    userId = storedId || generateGuestId();
    if (!storedId) ls.set(LS_KEYS.userId, userId);
  }

  const roomId = generateId(8);

  // Register room in persistence layer
  const createPromise = fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoUrl, userId, roomId }),
  }).then(async (res) => {
    if (!res.ok) throw new Error(res.status === 400 ? "Invalid video URL" : "Server error");
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Server error");
    const data = json.data;
    if (!data?.hostToken) throw new Error("No host token returned");
    ls.set(`host_${roomId}`, data.hostToken);
    return data;
  });

  return { roomId, userId, createPromise };
}
