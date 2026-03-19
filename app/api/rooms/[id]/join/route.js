import { NextResponse } from "next/server";
import { randomUUID }   from "crypto";
import { roomStore }    from "@/lib/roomStore";

const WS_HTTP_URL = process.env.WS_HTTP_URL || "http://localhost:3001";

export async function POST(_req, { params }) {
  const { id } = await params;

  // Check roomStore first; fall back to WS sidecar
  let exists = roomStore.has(id);
  if (!exists) {
    try {
      const res = await fetch(`${WS_HTTP_URL}/rooms/${id}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(2000),
      });
      exists = res.ok;
    } catch {
      exists = false;
    }
  }

  if (!exists) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const viewerToken = randomUUID();
  return NextResponse.json({ roomId: id, viewerToken });
}
