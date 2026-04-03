import RoomView from "@/features/room/RoomView";
import { roomStore } from "@/lib/roomStore";

// [Note] Local Networking: Use 127.0.0.1 instead of localhost for Node environment compatibility (avoids IPv6 resolution lag)
const WS_HTTP_URL = process.env.WS_HTTP_URL || "http://127.0.0.1:3001";

async function getRoomMeta(id, skipFetch = false) {
  const stored = await roomStore.get(id);
  if (stored) {
    return {
      roomId: id,
      videoUrl: stored.videoUrl || stored.video || "",
      subtitleUrl: stored.subtitleUrl || "",
      hasPassword: Boolean(stored.passwordHash),
      createdAt: stored.createdAt,
    };
  }

  if (skipFetch) return null;

  try {
    const res = await fetch(`${WS_HTTP_URL}/rooms/${id}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(600), // [Note] Fast Fail: Reduce timeout to 600ms for quicker waterfall fallback
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !Object.keys(data).length) return null;
    return {
      roomId: data.roomId ?? id,
      videoUrl: data.videoUrl || data.video || "", // [Note] Robustness: support both server (video) and store (videoUrl) keys
      subtitleUrl: data.subtitleUrl || "",
      hasPassword: Boolean(data.hasPassword || data.passwordHash),
      createdAt: data.lastUpdated ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  return {
    title: `Room ${id.slice(0, 6).toUpperCase()}`,
    description: "Join this Astra room for a private synchronized viewing experience with friends.",
    robots: { index: false }, // Prevent private rooms from being indexed
  };
}

export default async function RoomPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  
  // [Note] URL Reconstruction: Handles cases where valid video URLs with query 
  // params were passed un-encoded, causing browsers to split them into separate props.
  let urlParam = sp?.url ? decodeURIComponent(sp.url) : null;
  if (urlParam && (urlParam.includes("vidsrc") || urlParam.includes("vidlink") || urlParam.includes("youtube"))) {
    const APP_PARAMS = new Set(["url", "tmdb", "type", "s", "e", "h"]);
    const others = Object.keys(sp).filter(k => !APP_PARAMS.has(k));
    if (others.length > 0) {
      const qs = others.map(k => `${k}=${sp[k]}`).join("&");
      urlParam = urlParam.includes("?") ? `${urlParam}&${qs}` : `${urlParam}?${qs}`;
    }
  }

  // [Note] Absolute Fast-Path: If the client already provides a video URL via searchParams,
  // we bypass all server-side awaits (Redis & Fetch) to ensure an instant render.
  // The RoomView client component will then reconcile real-time state via Socket.io.
  if (urlParam !== null && urlParam.trim() !== "") {
    const room = {
      roomId: id,
      videoUrl: urlParam,
      hasPassword: false,
      isHostHint: sp?.h === "1",
      createdAt: Date.now(),
    };
    return <RoomView roomId={id} initialMeta={room} />;
  }

  // Waterfall Path: Only fetch from storage if the client hasn't provided a fallback URL.
  let room = await getRoomMeta(id);

  if (!room) {
    room = {
      roomId: id,
      videoUrl: "",
      hasPassword: false,
      createdAt: Date.now(),
    };
  }

  return <RoomView roomId={id} initialMeta={room} />;
}
