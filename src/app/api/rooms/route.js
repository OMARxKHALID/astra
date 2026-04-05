import { apiResponse } from "@/utils/apiResponse";
import { generateId } from "@/utils/id";
import { signJwt } from "@/lib/jwtAuth";
import { roomStore } from "@/lib/roomStore";
import { withRateLimit } from "@/lib/rateLimit";

export async function POST(request) {
  const limited = await withRateLimit(request, { key: "rooms:create", requests: 20, window: "1 m" });
  if (limited) return limited;
  try {
    const body = await request.json();
    const { videoUrl, userId, roomId: clientRoomId } = body;

    const finalVideoUrl =
      videoUrl && typeof videoUrl === "string" ? videoUrl.trim() : "";
    if (finalVideoUrl) {
      try {
        new URL(finalVideoUrl);
      } catch {
        return apiResponse.badRequest("Invalid video URL");
      }
    }

    const roomId =
      clientRoomId && typeof clientRoomId === "string"
        ? clientRoomId.slice(0, 36).trim()
        : generateId(8);
    const hostId =
      typeof userId === "string" && userId.trim()
        ? userId.trim()
        : generateId(21);

    const hostToken = signJwt({ sub: hostId, roomId, role: "host" });

    const stored = await roomStore.set(roomId, {
      roomId,
      videoUrl: finalVideoUrl,
      hostId,
      createdAt: Date.now(),
    });

    if (!stored) {
      console.error(`[api/rooms] Failed to persist room ${roomId} in Redis`);
    }

    return apiResponse.success({ roomId, hostToken, hostId }, 201);
  } catch (err) {
    return apiResponse.internalError(`Failed to create room: ${err.message}`);
  }
}
