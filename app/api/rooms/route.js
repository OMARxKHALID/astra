import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { roomStore }    from "@/lib/roomStore";

export async function POST(request) {
  try {
    const body = await request.json();
    const { videoUrl } = body;

    if (!videoUrl || typeof videoUrl !== "string") {
      return NextResponse.json({ error: "videoUrl is required" }, { status: 400 });
    }

    try { new URL(videoUrl); }
    catch {
      return NextResponse.json({ error: "Invalid video URL" }, { status: 400 });
    }

    const roomId    = randomUUID().slice(0, 8);
    const hostId    = randomUUID();
    const hostToken = randomUUID();

    await roomStore.set(roomId, {
      roomId,
      videoUrl,
      hostId,
      hostToken,
      createdAt: Date.now(),
    });

    return NextResponse.json({ roomId, hostToken, hostId }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
