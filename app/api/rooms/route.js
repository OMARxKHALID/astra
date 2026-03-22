import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { signJwt } from "@/lib/jwt";
import { roomStore } from "@/lib/roomStore";

export async function POST(request) {
  try {
    const body = await request.json();
    const { videoUrl } = body;

    if (!videoUrl || typeof videoUrl !== "string")
      return NextResponse.json(
        { error: "videoUrl is required" },
        { status: 400 },
      );

    try {
      new URL(videoUrl);
    } catch {
      return NextResponse.json({ error: "Invalid video URL" }, { status: 400 });
    }

    const roomId = randomUUID().slice(0, 8);
    const hostId = randomUUID();

    // JWT host token — signed with JWT_SECRET (HS256), expires in 24h.
    // Claims: sub = hostId, roomId, role = "host"
    // The socket server verifies the signature; no UUID secret stored in Redis.
    const hostToken = signJwt({ sub: hostId, roomId, role: "host" }, 86400);

    await roomStore.set(roomId, {
      roomId,
      videoUrl,
      hostId,
      // hostToken is NOT stored in Redis — it's verified by signature only.
      // This means a stolen token can't be "looked up" to check validity.
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
