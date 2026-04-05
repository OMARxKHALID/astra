import { apiResponse } from "@/utils/apiResponse";
import { fetchTMDB, normalizeTMDB } from "@/services/tmdb";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.slice(0, 200) || "";
    if (!q) return apiResponse.success({ items: [] });

    const data = await fetchTMDB("search/multi", `&query=${encodeURIComponent(q)}&include_adult=false`);
    const items = (data?.results || [])
      .filter((r) => r.media_type === "movie" || r.media_type === "tv")
      .map((i) => normalizeTMDB(i));

    return apiResponse.success({ items });
  } catch (err) {
    return apiResponse.success({ items: [] });
  }
}
