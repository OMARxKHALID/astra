import { NextResponse } from "next/server";
import { redisCache } from "@/lib/redis";

const VALID_ID_PATTERN = /^\d+$/;

export async function GET(req, { params }) {
  const key = process.env.TMDB_API_KEY;
  const { id, number } = await params;

  if (!key) return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  if (!id || !VALID_ID_PATTERN.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  if (!number || !VALID_ID_PATTERN.test(number)) return NextResponse.json({ error: "Invalid season number" }, { status: 400 });

  const cacheKey = `tmdb:season:${id}:${number}`;

  try {
    if (redisCache) {
      const cached = await redisCache.get(cacheKey);
      if (cached) return NextResponse.json(cached);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${id}/season/${number}?api_key=${key}&language=en-US`,
      { 
        next: { revalidate: 3600 },
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
    
    if (!res.ok) return NextResponse.json({ error: "TMDB error" }, { status: 502 });

    const d = await res.json();

    const episodes = (d.episodes || []).map((ep) => ({
      id: ep.id,
      number: ep.episode_number,
      name: ep.name,
      overview: ep.overview,
      airDate: ep.air_date,
      runtime: ep.runtime || null,
      still: ep.still_path
        ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
        : null,
    }));

    const result = { episodes, meta: { season_number: d.season_number } };
    
    if (redisCache) {
      await redisCache.set(cacheKey, result, { ex: 3600 });
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
