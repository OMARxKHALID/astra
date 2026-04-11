import { apiResponse } from "@/utils/apiResponse";
import { getMovieDetails, getTVDetails } from "@/features/content/services/tmdb";

const VALID_ID_PATTERN = /^\d+$/;

export async function GET(req, { params }) {
  const { type, id } = await params;

  if (!id || !VALID_ID_PATTERN.test(id)) {
    return apiResponse.badRequest("Invalid TMDB ID format");
  }

  if (type !== "movie" && type !== "tv") {
    return apiResponse.badRequest("Invalid content type. Must be 'movie' or 'tv'");
  }

  try {
    const data = type === "movie" ? await getMovieDetails(id) : await getTVDetails(id);
    
    if (!data) {
      return apiResponse.notFound(`${type === "movie" ? "Movie" : "TV Show"} not found in TMDB`);
    }
    
    return apiResponse.success(data);
  } catch (err) {
    return apiResponse.internalError(`Failed to fetch ${type} details: ${err.message}`);
  }
}
