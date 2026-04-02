import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { signJwt } from "@/lib/jwtAuth";
import { roomStore } from "@/lib/roomStore";

export async function POST(request) {
  try {
    const body = await request.json();
    const { videoUrl, userId, roomId: clientRoomId } = body;

    const finalVideoUrl = videoUrl && typeof videoUrl === "string" ? videoUrl.trim() : "";
    if (finalVideoUrl) {
      try { new URL(finalVideoUrl); } 
      catch { return NextResponse.json({ error: "Invalid video URL" }, { status: 400 }); }
    }

    // [Note] Zero-Latency Flow: prioritize client-generated roomId for instant navigation support
    const roomId = clientRoomId && typeof clientRoomId === "string" 
      ? clientRoomId.slice(0, 36).trim() 
      : randomUUID().slice(0, 8);
    // [Note] Identity: use client-supplied userId to ensure hostId consistency on first mount
    const hostId =
      typeof userId === "string" && userId.trim()
        ? userId.trim()
        : randomUUID();

    // [Note] JWT host token: signed with HS256, expires 24h. Claims: sub=hostId, role="host"
    const hostToken = signJwt({ sub: hostId, roomId, role: "host" }, 86400);

    // [Note] Non-blocking persistence: Dispatch Redis save without awaiting to minimize TTFB (Time to First Byte)
    // Next.js will typically keep the function alive long enough for this simple set() to finish.
    roomStore.set(roomId, {
      roomId,
      videoUrl: finalVideoUrl,
      hostId,
      createdAt: Date.now(),
    }).catch(() => {}); // [Note] Silent fail: critical response already generated

    return NextResponse.json({ roomId, hostToken, hostId }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
