import { NextResponse } from "next/server";
import { roomStore }    from "@/lib/roomStore";

const WS_HTTP_URL = process.env.WS_HTTP_URL || "http://localhost:3001";

/**
 * Try the WS HTTP sidecar for live room state.
 * Falls back gracefully if the sidecar isn't reachable.
 */
async function queryWsSidecar(id) {
  try {
    const res = await fetch(`${WS_HTTP_URL}/rooms/${id}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Object.keys(data).length ? data : null;
  } catch {
    return null;
  }
}

export async function GET(_req, { params }) {
  const { id } = await params;

  // 1. Check in-process roomStore (populated on room creation)
  const stored = roomStore.get(id);
  if (stored) {
    // Also attempt to enrich with live state from WS sidecar
    const live = await queryWsSidecar(id);
    return NextResponse.json({
      roomId:      id,
      videoUrl:    live?.videoUrl    ?? stored.videoUrl,
      isPlaying:   live?.isPlaying   ?? false,
      currentTime: live?.currentTime ?? 0,
      lastUpdated: live?.lastUpdated ?? stored.createdAt,
      createdAt:   stored.createdAt,
    });
  }

  // 2. roomStore missed (server restart / different instance) — query WS sidecar
  const live = await queryWsSidecar(id);
  if (live) {
    return NextResponse.json({
      roomId:      live.roomId,
      videoUrl:    live.videoUrl,
      isPlaying:   live.isPlaying,
      currentTime: live.currentTime,
      lastUpdated: live.lastUpdated,
      createdAt:   live.lastUpdated,
    });
  }

  return NextResponse.json({ error: "Room not found" }, { status: 404 });
}
