import { notFound } from "next/navigation";
import RoomClient from "@/components/client/RoomClient";
import { roomStore } from "@/lib/roomStore";

const WS_HTTP_URL = process.env.WS_HTTP_URL || "http://localhost:3001";

/**
 * Fetch room metadata for the initial SSR render.
 *
 * publicState() from the socket server returns:
 *   { roomId, video, subtitleUrl, paused, videoTS, lastUpdated, ... }
 *
 * We normalise to { roomId, videoUrl } so RoomClient's
 * `initialMeta?.videoUrl` always resolves correctly regardless of which
 * source the data came from.
 */
async function getRoomMeta(id) {
  // 1. Check Redis first (fastest, most reliable)
  const stored = await roomStore.get(id);
  if (stored) {
    return {
      roomId: id,
      videoUrl: stored.videoUrl ?? stored.video ?? "",
      createdAt: stored.createdAt,
    };
  }

  // 2. Fall back to querying the live socket server via its HTTP sidecar
  try {
    const res = await fetch(`${WS_HTTP_URL}/rooms/${id}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !Object.keys(data).length) return null;

    // Normalise: publicState returns "video" (not "videoUrl")
    return {
      roomId: data.roomId ?? id,
      videoUrl: data.video || data.videoUrl || "",
      createdAt: data.lastUpdated ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  return {
    title: `Room ${id.slice(0, 6).toUpperCase()} — Watch Together`,
    description: "Join this Watch Together room for synchronized viewing.",
  };
}

export default async function RoomPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const urlParam = sp?.url ? decodeURIComponent(sp.url) : null;

  let room = await getRoomMeta(id);

  // If room isn't in Redis or live server yet, seed it from the URL param
  // (present when navigating immediately after CreateRoomForm)
  if (!room && urlParam) {
    room = { roomId: id, videoUrl: urlParam, createdAt: Date.now() };
  }

  if (!room) notFound();

  return <RoomClient roomId={id} initialMeta={room} />;
}
