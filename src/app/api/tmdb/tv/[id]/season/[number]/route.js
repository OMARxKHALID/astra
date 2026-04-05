import { apiResponse } from "@/utils/apiResponse";
import { redisCache } from "@/lib/redis";

const VALID_ID_PATTERN = /^\d+$/;

export async function GET(req, { params }) {
  const key = process.env.TMDB_API_KEY;
  const { id, number } = await params;

  if (!key) return apiResponse.internalError("TMDB API key not configured");
  if (!id || !VALID_ID_PATTERN.test(id)) return apiResponse.badRequest("Invalid TMDB ID");
  if (!number || !VALID_ID_PATTERN.test(number)) return apiResponse.badRequest("Invalid season number");

  const cacheKey = `tmdb:season:${id}:${number}`;

  try {
    if (redisCache) {
      const cached = await redisCache.get(cacheKey);
      if (cached) return apiResponse.success(cached);
    }

    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${id}/season/${number}?api_key=${key}&language=en-US`,
      { signal: AbortSignal.timeout(10000) },
    );
    
    if (!res.ok) return apiResponse.error("TMDB service error", 502, "TMDB_FETCH_ERROR");

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

    return apiResponse.success(result);
  } catch (err) {
    return apiResponse.internalError(`Failed to fetch season details: ${err.message}`);
  }
}
