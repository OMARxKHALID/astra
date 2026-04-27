import { LS_KEYS } from "@/constants/config";
import { localStorage } from "@/utils/localStorage";
import { id } from "@/utils/id";

export function createRoom(videoUrl, session = null) {
  let userId;
  if (session?.user?.id) {
    userId = session.user.id;
  } else {
    const storedId = localStorage.get(LS_KEYS.userId);
    userId = storedId || id.generateGuest();
    if (!storedId) localStorage.set(LS_KEYS.userId, userId);
  }

  const roomId = id.generate(8);

  // Register room in persistence layer
  const createPromise = fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoUrl, userId, roomId }),
  }).then(async (res) => {
    if (!res.ok)
      throw new Error(
        res.status === 400 ? "Invalid video URL" : "Server error",
      );
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Server error");
    const data = json.data;
    if (!data?.hostToken) throw new Error("No host token returned");
    localStorage.set(`host_${roomId}`, data.hostToken);
    return data;
  });

  return { roomId, userId, createPromise };
}
