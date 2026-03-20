import { NextResponse } from "next/server";
import { roomStore } from "@/lib/roomStore";

const WS_HTTP_URL = process.env.WS_HTTP_URL || "http://localhost:3001";

/**
 * Query the live socket server for a room's current state.
 *
 * publicState() returns: { roomId, video, subtitleUrl, paused, videoTS,
 *   lastUpdated, hostId, playbackRate, hostOnlyControls }
 *
 * We normalise the field names here to the convention the rest of the Next.js
 * app uses:  video → videoUrl,  paused → isPlaying (inverted),  videoTS → currentTime
 */
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

  const stored = await roomStore.get(id);
  if (stored) {
    // Prefer live state for time-sensitive fields; fall back to persisted store
    const live = await queryWsSidecar(id);
    return NextResponse.json({
      roomId: id,
      videoUrl: live?.videoUrl ?? stored.videoUrl ?? "",
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
      isPlaying: live.isPlaying,
      currentTime: live.currentTime,
      lastUpdated: live.lastUpdated,
      createdAt: live.lastUpdated,
    });
  }

  return NextResponse.json({ error: "Room not found" }, { status: 404 });
}
