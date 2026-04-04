import { NextResponse } from "next/server";
import { roomStore } from "@/lib/roomStore";

const WS_HTTP_URL = process.env.WS_HTTP_URL || "http://localhost:3001";

// Synchronize Next.js API with the live Socket.IO server's in-memory room state
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
      videoUrl: data.video || "", // publicState uses "video" not "videoUrl"
      subtitleUrl: data.subtitleUrl || "",
      isPlaying: data.paused === false, // publicState uses "paused" not "isPlaying"
      currentTime: data.videoTS ?? 0, // publicState uses "videoTS" not "currentTime"
      lastUpdated: data.lastUpdated ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export async function GET(_req, { params }) {
  const { id } = await params;

  if (!id || typeof id !== "string" || id.length > 50) {
    return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
  }

  const stored = await roomStore.get(id);
  if (stored) {
    // Prefer live state for time-sensitive fields; fall back to persisted store
    const live = await queryWsSidecar(id);
    return NextResponse.json({
      roomId: id,
      videoUrl: live?.videoUrl ?? stored.videoUrl ?? "",
      subtitleUrl: live?.subtitleUrl ?? stored.subtitleUrl ?? "",
      isPlaying: live?.isPlaying ?? stored.isPlaying ?? false,
      currentTime: live?.currentTime ?? stored.currentTime ?? 0,
      lastUpdated: live?.lastUpdated ?? stored.lastUpdated ?? stored.createdAt,
      createdAt: stored.createdAt,
    });
  }

  // No Redis entry — query the live server only
  const live = await queryWsSidecar(id);
  if (live) {
    return NextResponse.json({
      roomId: live.roomId,
      videoUrl: live.videoUrl,
      subtitleUrl: live.subtitleUrl,
      isPlaying: live.isPlaying,
      currentTime: live.currentTime,
      lastUpdated: live.lastUpdated,
      createdAt: live.lastUpdated,
    });
  }

  return NextResponse.json({ error: "Room not found" }, { status: 404 });
}
