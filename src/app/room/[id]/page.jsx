import RoomView from "@/features/room/RoomView";
import { roomStore } from "@/lib/roomStore";

const WS_HTTP_URL = process.env.WS_HTTP_URL || "http://localhost:3001";

async function getRoomMeta(id) {
  const stored = await roomStore.get(id);
  if (stored) {
    return {
      roomId: id,
      videoUrl: stored.videoUrl ?? stored.video ?? "",
      subtitleUrl: stored.subtitleUrl || "",
      hasPassword: Boolean(stored.passwordHash),
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
    if (!data || !Object.keys(data).length) return null;
    return {
      roomId: data.roomId ?? id,
      videoUrl: data.video || data.videoUrl || "",
      subtitleUrl: data.subtitleUrl || "",
      hasPassword: Boolean(data.hasPassword),
      createdAt: data.lastUpdated ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  return {
    title: `Room ${id.slice(0, 6).toUpperCase()} — WatchTogether`,
    description: "Join this WatchTogether room for synchronized viewing.",
  };
}

export default async function RoomPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  
  // [Note] URL Reconstruction: Handles cases where valid video URLs with query 
  // params were passed un-encoded, causing browsers to split them into separate props.
  let urlParam = sp?.url ? decodeURIComponent(sp.url) : null;
  if (urlParam && (urlParam.includes("vidsrc") || urlParam.includes("vidlink") || urlParam.includes("youtube"))) {
    const APP_PARAMS = new Set(["url", "tmdb", "type", "s", "e"]);
    const others = Object.keys(sp).filter(k => !APP_PARAMS.has(k));
    if (others.length > 0) {
      const qs = others.map(k => `${k}=${sp[k]}`).join("&");
      urlParam = urlParam.includes("?") ? `${urlParam}&${qs}` : `${urlParam}?${qs}`;
    }
  }

  let room = await getRoomMeta(id);

  if (!room) {
    room = {
      roomId: id,
      videoUrl: urlParam || "",
      hasPassword: false,
      createdAt: Date.now(),
    };
  }

  return <RoomView roomId={id} initialMeta={room} />;
}
