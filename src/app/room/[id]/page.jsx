import { redirect } from "next/navigation";
import RoomView from "@/features/room/RoomView";
import { roomStore } from "@/lib/roomStore";

// Use 127.0.0.1 instead of localhost to avoid IPv6 resolution lag in Node
const WS_HTTP_URL = process.env.WS_HTTP_URL || "http://127.0.0.1:3001";

async function getRoomMeta(id) {
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

  // [Note] Fall back to live WS node — covers rooms active in RAM but not yet persisted
  try {
    const res = await fetch(`${WS_HTTP_URL}/rooms/${id}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(600),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !Object.keys(data).length) return null;
    return {
      roomId: data.roomId ?? id,
      videoUrl: data.videoUrl || data.video || "",
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
    robots: { index: false },
  };
}

export default async function RoomPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;

  // Reconstruct URLs split by un-encoded query params into separate searchParams props
  let urlParam = sp?.url ? decodeURIComponent(sp.url) : null;
  if (urlParam && urlParam.startsWith("http")) {
    try {
      const parsed = new URL(urlParam);
      const APP_PARAMS = new Set(["url", "tmdb", "type", "s", "e", "h"]);
      const others = Object.keys(sp).filter(k => !APP_PARAMS.has(k));
      if (others.length > 0) {
        const qs = others.flatMap(k => {
          const val = sp[k];
          const arr = Array.isArray(val) ? val : [val];
          return arr.filter(Boolean).map(v => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
        }).join("&");
        if (qs) {
          urlParam = parsed.search ? `${urlParam}&${qs}` : `${urlParam}?${qs}`;
        }
      }
    } catch {
      // malformed URL — use as-is
    }
  }

  // Fast-path: host just created this room and is navigating in with ?url=…&h=1.
  // Skip the DB check — the socket server will validate the host token on JOIN_ROOM.
  const isHostFastPath = urlParam !== null && urlParam.trim() !== "" && sp?.h === "1";
  if (isHostFastPath) {
    const room = {
      roomId: id,
      videoUrl: urlParam,
      hasPassword: false,
      isHostHint: true,
      hostId: "",
      createdAt: Date.now(),
    };
    return <RoomView roomId={id} initialMeta={room} />;
  }

  // Waterfall path: verify the room exists before rendering anything.
  const room = await getRoomMeta(id);

  if (!room) {
    // [Note] Room not in Redis or live RAM — refuse to render a phantom session
    redirect("/?expired=1");
  }

  return <RoomView roomId={id} initialMeta={room} />;
}
