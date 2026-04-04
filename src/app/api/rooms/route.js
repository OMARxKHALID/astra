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

    const roomId = clientRoomId && typeof clientRoomId === "string" 
      ? clientRoomId.slice(0, 36).trim() 
      : randomUUID().slice(0, 8);
    const hostId =
      typeof userId === "string" && userId.trim()
        ? userId.trim()
        : randomUUID();

    const hostToken = signJwt({ sub: hostId, roomId, role: "host" }, 86400);

    const stored = await roomStore.set(roomId, {
      roomId,
      videoUrl: finalVideoUrl,
      hostId,
      createdAt: Date.now(),
    });
    if (!stored) {
      console.error(`[api/rooms] Failed to persist room ${roomId} in Redis`);
    }

    return NextResponse.json({ roomId, hostToken, hostId }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
