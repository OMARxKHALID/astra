import { notFound } from "next/navigation";
import RoomClient from "@/components/client/RoomClient";
import { roomStore } from "@/lib/roomStore";

const WS_HTTP_URL = process.env.WS_HTTP_URL || "http://localhost:3001";

async function getRoomMeta(id) {
  // 1. Fast path: in-process roomStore (set during POST /api/rooms)
  const stored = roomStore.get(id);
  if (stored) {
    return {
      roomId: id,
      videoUrl: stored.videoUrl,
      createdAt: stored.createdAt,
    };
  }
  // 2. Fallback: query the WS HTTP sidecar (handles server restarts)
  try {
    const res = await fetch(`${WS_HTTP_URL}/rooms/${id}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Object.keys(data).length ? data : null;
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
  // The URL query param `?url=…` is written by CreateRoomForm on creation.
  // This is the fix for "room not found on first load" — the roomStore lookup
  // can fail in dev (HMR resets the module) so we always have this fallback.
  const urlParam = sp?.url ? decodeURIComponent(sp.url) : null;

  let room = await getRoomMeta(id);

  if (!room && urlParam) {
    // First-load race: roomStore not populated yet, but we have the URL
    room = { roomId: id, videoUrl: urlParam, createdAt: Date.now() };
  }

  // Still nothing — either a truly stale link or an invalid ID
  if (!room) notFound();

  return <RoomClient roomId={id} initialMeta={room} />;
}
