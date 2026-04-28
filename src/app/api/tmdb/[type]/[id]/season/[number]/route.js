import { apiResponse } from "@/utils/apiResponse";
import { getSeasonData } from "@/features/content/services/tmdb";
import { withRateLimit } from "@/lib/rateLimit";

const VALID_ID_PATTERN = /^\d+$/;

export async function GET(req, { params }) {
  const limited = await withRateLimit(req, { key: "tmdb:season", requests: 30, window: "1 m" });
  if (limited) return limited;
  const { type, id, number } = await params;

  if (type !== "tv")
    return apiResponse.badRequest("Seasons are only available for TV shows");
  if (!id || !VALID_ID_PATTERN.test(id))
    return apiResponse.badRequest("Invalid TMDB ID");
  if (!number || !VALID_ID_PATTERN.test(number))
    return apiResponse.badRequest("Invalid season number");

  try {
    const result = await getSeasonData(id, number);
    if (!result)
      return apiResponse.error("TMDB service error", 502, "TMDB_FETCH_ERROR");

    return apiResponse.success(result);
  } catch (err) {
    return apiResponse.internalError(
      `Failed to fetch season details: ${err.message}`,
    );
  }
}
