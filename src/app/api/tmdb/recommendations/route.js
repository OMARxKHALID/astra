import { NextResponse } from "next/server";
import { fetchTMDB, normalizeTMDB } from "@/services/tmdb";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.slice(0, 20) || "";
  const type = searchParams.get("type");

  if (!id || !/^\d+$/.test(id)) return NextResponse.json({ items: [] });
  if (type && type !== "movie" && type !== "tv") return NextResponse.json({ items: [] });

  const validType = type || "movie";

  try {
    const data = await fetchTMDB(`${validType}/${id}/recommendations`);
    const items = (data?.results || []).map((i) => normalizeTMDB(i, validType));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
