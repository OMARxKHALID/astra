import { NextResponse } from "next/server";
import { searchYouTube } from "@/services/youtube";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const pageToken = searchParams.get("pageToken");

  if (!q) return NextResponse.json({ items: [], nextPageToken: null });

  const results = await searchYouTube(q, pageToken);
  return NextResponse.json(results);
}
