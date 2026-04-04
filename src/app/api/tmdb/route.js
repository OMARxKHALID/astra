import { NextResponse } from "next/server";
import { fetchTMDB, normalizeTMDB } from "@/services/tmdb";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.slice(0, 200) || "";
  if (!q) return NextResponse.json({ items: [] });

  try {
    const data = await fetchTMDB("search/multi", `&query=${encodeURIComponent(q)}&include_adult=false`);
    const items = (data?.results || [])
      .filter((r) => r.media_type === "movie" || r.media_type === "tv")
      .map((i) => normalizeTMDB(i));

    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ items: [] });
  }
}
