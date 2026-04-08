import { apiResponse } from "@/utils/apiResponse";
import { redisCache } from "@/lib/redis";
import { getSeasonData } from "@/features/content/services/tmdb";

const VALID_ID_PATTERN = /^\d+$/;

export async function GET(req, { params }) {
  const { type, id, number } = await params;

  if (type !== "tv") return apiResponse.badRequest("Seasons are only available for TV shows");
  if (!id || !VALID_ID_PATTERN.test(id)) return apiResponse.badRequest("Invalid TMDB ID");
  if (!number || !VALID_ID_PATTERN.test(number)) return apiResponse.badRequest("Invalid season number");

  const cacheKey = `tmdb:season:${id}:${number}`;

  try {
    if (redisCache) {
      const cached = await redisCache.get(cacheKey);
      if (cached) return apiResponse.success(cached);
    }

    const result = await getSeasonData(id, number);
    
    if (!result) return apiResponse.error("TMDB service error", 502, "TMDB_FETCH_ERROR");

    if (redisCache) {
      await redisCache.set(cacheKey, result, { ex: 3600 });
    }

    return apiResponse.success(result);
  } catch (err) {
    return apiResponse.internalError(`Failed to fetch season details: ${err.message}`);
  }
}
