import { apiResponse } from "@/utils/apiResponse";
import { NextResponse } from "next/server";
import { roomStore } from "@/lib/roomStore";

const WS_HTTP_URL = process.env.WS_HTTP_URL || "http://localhost:3001";

async function queryWsSidecar(id) {
  try {
    const res = await fetch(`${WS_HTTP_URL}/rooms/${id}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !Object.keys(data).length) return null;

    return {
      roomId: data.roomId,
      videoUrl: data.video || "",
      subtitleUrl: data.subtitleUrl || "",
      isPlaying: data.paused === false,
      currentTime: data.videoTS ?? 0,
      lastUpdated: data.lastUpdated ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export async function GET(_req, { params }) {
  const { id } = await params;

  if (!id || typeof id !== "string" || id.length > 50) {
    return apiResponse.badRequest("Invalid room ID");
  }

  const stored = await roomStore.get(id);
  if (stored) {
    const live = await queryWsSidecar(id);
    return apiResponse.success({
      roomId: id,
      videoUrl: live?.videoUrl ?? stored.videoUrl ?? "",
      subtitleUrl: live?.subtitleUrl ?? stored.subtitleUrl ?? "",
      isPlaying: live?.isPlaying ?? stored.isPlaying ?? false,
      currentTime: live?.currentTime ?? stored.currentTime ?? 0,
      lastUpdated: live?.lastUpdated ?? stored.lastUpdated ?? stored.createdAt,
      createdAt: stored.createdAt,
    });
  }

  const live = await queryWsSidecar(id);
  if (live) {
    return apiResponse.success({
      roomId: live.roomId,
      videoUrl: live.videoUrl,
      subtitleUrl: live.subtitleUrl,
      isPlaying: live.isPlaying,
      currentTime: live.currentTime,
      lastUpdated: live.lastUpdated,
      // [Note] createdAt unknown when room only exists in the live sidecar (not persisted yet)
      createdAt: null,
    });
  }

  return apiResponse.notFound("Room not found");
}
