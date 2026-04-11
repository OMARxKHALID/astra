import { apiResponse } from "@/utils/apiResponse";
import { isValidUrl } from "@/lib/ssrf";


export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url")?.slice(0, 1000) || "";

    if (!url) {
      return apiResponse.badRequest("Missing url parameter");
    }

    const decodedUrl = decodeURIComponent(url);
    if (!(await isValidUrl(decodedUrl))) {
      return apiResponse.badRequest("Invalid or disallowed URL");
    }

    const res = await fetch(decodedUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000),
    });

    return apiResponse.success({
      contentType: res.headers.get("content-type") || "",
      contentLength: res.headers.get("content-length") || "",
      status: res.status,
      ok: res.ok,
    });
  } catch (err) {
    return apiResponse.error(err.message || "Probe failed", 500, "PROBE_ERROR");
  }
}
