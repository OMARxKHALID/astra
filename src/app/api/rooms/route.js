import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { signJwt } from "@/lib/jwtAuth";
import { roomStore } from "@/lib/roomStore";

export async function POST(request) {
  try {
    const body = await request.json();
    const { videoUrl, userId } = body;

    // [Note] Optional videoUrl: allows creating empty rooms for later selection
    const finalVideoUrl = videoUrl && typeof videoUrl === "string" ? videoUrl.trim() : "";

    if (finalVideoUrl) {
      try {
        new URL(finalVideoUrl);
      } catch {
        return NextResponse.json({ error: "Invalid video URL" }, { status: 400 });
      }
    }

    const roomId = randomUUID().slice(0, 8);
    // [Note] Identity: use client-supplied userId to ensure hostId consistency on first mount
    const hostId =
      typeof userId === "string" && userId.trim()
        ? userId.trim()
        : randomUUID();

    // [Note] JWT host token: signed with HS256, expires 24h. Claims: sub=hostId, role="host"
    const hostToken = signJwt({ sub: hostId, roomId, role: "host" }, 86400);

    // [Note] Room persistence: house-keeping for initial metadata
    await roomStore.set(roomId, {
      roomId,
      videoUrl: finalVideoUrl,
      hostId,
      createdAt: Date.now(),
    });

    return NextResponse.json({ roomId, hostToken, hostId }, { status: 201 });
  } catch (err) {
    console.error("[rooms/route] Error:", err.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
