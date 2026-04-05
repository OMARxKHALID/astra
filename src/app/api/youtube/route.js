import { apiResponse } from "@/utils/apiResponse";
import { searchYouTube } from "@/services/youtube";
import { withRateLimit } from "@/lib/rateLimit";

export async function GET(req) {
  const limited = await withRateLimit(req, { key: "youtube:search", requests: 30, window: "1 m" });
  if (limited) return limited;
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.slice(0, 200)?.trim();
    const pageToken = searchParams.get("pageToken");

    if (!q) return apiResponse.success({ items: [], nextPageToken: null });

    const results = await searchYouTube(q, pageToken);
    return apiResponse.success(results);
  } catch (err) {
    return apiResponse.success({ items: [], nextPageToken: null });
  }
}
