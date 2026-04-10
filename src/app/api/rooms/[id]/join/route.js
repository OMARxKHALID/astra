import { apiResponse } from "@/utils/apiResponse";
import { roomStore } from "@/lib/roomStore";
import { WS_HTTP_URL } from "@/constants/config";

export async function POST(_req, { params }) {
  const { id } = await params;

  if (!id || typeof id !== "string" || id.length > 50) {
    return apiResponse.badRequest("Invalid room ID");
  }

  let exists = await roomStore.get(id);
  if (!exists) {
    try {
      const res = await fetch(`${WS_HTTP_URL}/rooms/${id}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(2000),
      });
      exists = res.ok;
    } catch {
      exists = false;
    }
  }

  if (!exists) {
    return apiResponse.notFound("Room not found");
  }

  // [Note] No viewer token issued — socket-level identity is handled by userId + JWT host token
  return apiResponse.success({ roomId: id });
}
