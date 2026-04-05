import { apiResponse } from "@/utils/apiResponse";
import { getMovieDetails } from "@/services/tmdbDetails";

const VALID_ID_PATTERN = /^\d+$/;

export async function GET(req, { params }) {
  const { id } = await params;
  if (!id || !VALID_ID_PATTERN.test(id)) {
    return apiResponse.badRequest("Invalid TMDB ID format");
  }

  try {
    const data = await getMovieDetails(id);
    if (!data) return apiResponse.notFound("Movie not found in TMDB");
    return apiResponse.success(data);
  } catch (err) {
    return apiResponse.internalError(`Failed to fetch movie: ${err.message}`);
  }
}
