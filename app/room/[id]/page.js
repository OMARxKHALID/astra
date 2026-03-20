import { notFound } from "next/navigation";
import RoomClient from "@/components/client/RoomClient";
import { roomStore } from "@/lib/roomStore";

const WS_HTTP_URL = process.env.WS_HTTP_URL || "http://localhost:3001";

async function getRoomMeta(id) {
  const stored = roomStore.get(id);
  if (stored) {
    return {
      roomId: id,
      videoUrl: stored.videoUrl,
      createdAt: stored.createdAt,
    };
  }
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
  const urlParam = sp?.url ? decodeURIComponent(sp.url) : null;

  let room = await getRoomMeta(id);

  if (!room && urlParam) {
    room = { roomId: id, videoUrl: urlParam, createdAt: Date.now() };
  }

  if (!room) notFound();

  return <RoomClient roomId={id} initialMeta={room} />;
}
