import { apiResponse } from "@/utils/apiResponse";
import { fetchTMDB, normalizeTMDB } from "@/services/tmdb";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.slice(0, 20) || "";
    const type = searchParams.get("type");

    if (!id || !/^\d+$/.test(id)) return apiResponse.success({ items: [] });
    if (type && type !== "movie" && type !== "tv") return apiResponse.success({ items: [] });

    const validType = type || "movie";

    const data = await fetchTMDB(`${validType}/${id}/recommendations`);
    const items = (data?.results || []).map((i) => normalizeTMDB(i, validType));

    return apiResponse.success({ items });
  } catch (err) {
    return apiResponse.success({ items: [] });
  }
}
