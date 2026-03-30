import { NextResponse } from "next/server";
import { fetchTMDB, normalizeTMDB } from "@/services/tmdb";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") || "movie";

  if (!id) return NextResponse.json({ items: [] });

  try {
    const data = await fetchTMDB(`${type}/${id}/recommendations`);
    const items = (data?.results || []).map((i) => normalizeTMDB(i, type));

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[TMDB Recommendations API Error]", err);
    return NextResponse.json({ items: [] });
  }
}
