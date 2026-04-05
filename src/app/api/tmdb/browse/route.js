import { apiResponse } from "@/utils/apiResponse";
import { getBrowseData } from "@/services/tmdb";

export async function GET() {
  try {
    const data = await getBrowseData();
    return apiResponse.success(data);
  } catch (err) {
    return apiResponse.error("Failed to load browse content", 500, "BROWSE_FETCH_ERROR");
  }
}
