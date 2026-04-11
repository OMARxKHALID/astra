import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import RoomView from "@/features/room/RoomView";
import { roomStore } from "@/lib/roomStore";

// [Note] 127.0.0.1: avoids IPv6 resolution lag in Node
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
    title: `Room ${id.slice(0, 6).toUpperCase()} | Astra`,
    description: "Astra is a real-time video synchronization platform for watch parties. Stream with friends while keeping everyone in perfect sync.",
    robots: { index: false },
  };
}

export default async function RoomPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;

  // [Note] URL Reconstruction: handles un-encoded query params split by searchParams prop
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

  // [Note] Fast-path: Host navigating with ?url=...&h=1 skips DB check (socket server validates token)
  const isHostFastPath = urlParam !== null && urlParam.trim() !== "" && sp?.h === "1";
  const isLocalOnlyUrl =
    typeof urlParam === "string" && urlParam.startsWith("blob:");
  if (isHostFastPath) {
    const room = {
      roomId: id,
      videoUrl: isLocalOnlyUrl ? "" : urlParam,
      hasPassword: false,
      isHostHint: true,
      hostId: "",
      createdAt: Date.now(),
    };
    return (
      <RoomView
        roomId={id}
        initialMeta={room}
        initialLocalVideoUrl={isLocalOnlyUrl ? urlParam : ""}
      />
    );
  }

  const room = await getRoomMeta(id);

  if (!room) {
    // [Note] Room not in Redis or live RAM — refuse to render a phantom session
    redirect("/?expired=1");
  }

  // [Note] Client Cookie Pattern: Read user preferences from cookies for SSR-safe initial state
  const cookieStore = await cookies();
  const preferences = {
    theatreMode: cookieStore.get("astra_theatre_mode")?.value === "true",
    sidebarOpen: cookieStore.get("astra_sidebar_open")?.value !== "false",
    ambilight: cookieStore.get("astra_ambilight")?.value !== "false",
    guestName: cookieStore.get("astra_guest_name")?.value || null,
  };

  return <RoomView roomId={id} initialMeta={room} initialPreferences={preferences} />;
}
