import { apiResponse } from "@/utils/apiResponse";
import { withRateLimit } from "@/lib/rateLimit";

const ALLOWED_PROTOCOLS = ["https:"];
const BLOCKED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];
const MAX_RESPONSE_SIZE = 100 * 1024 * 1024;

function isValidUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) return false;

    const hostname = url.hostname.toLowerCase();

    if (BLOCKED_HOSTS.includes(hostname)) return false;
    if (
      hostname.startsWith("127.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.") ||
      hostname.startsWith("172.")
    ) {
      return false;
    }
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(hostname)) {
    }

    return true;
  } catch {
    return false;
  }
}

export async function GET(request) {
  try {
    const limited = await withRateLimit(request, { key: "proxy:fetch", requests: 10, window: "1 m" });
    if (limited) return limited;

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url")?.slice(0, 1000) || "";

    if (!url) {
      return apiResponse.badRequest("No URL provided");
    }

    let targetUrl;
    try {
      targetUrl = decodeURIComponent(url);
    } catch {
      return apiResponse.badRequest("Malformed URL encoding");
    }

    if (!isValidUrl(targetUrl)) {
      return apiResponse.badRequest(
        "Invalid or disallowed URL (Private IPs and localhost are blocked)",
      );
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AstraSync/1.0",
        Accept: "*/*",
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      return apiResponse.error(
        `Proxy fetch failed: ${response.status}`,
        response.status,
        "FETCH_FAILURE",
      );
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      return apiResponse.error("File too large", 413, "FILE_TOO_LARGE");
    }

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Range, Referer, Origin");
    headers.set(
      "Access-Control-Expose-Headers",
      "Content-Length, Content-Range",
    );
    headers.set("Accept-Ranges", "bytes");
    headers.set(
      "Content-Type",
      response.headers.get("content-type") || "video/mp4",
    );
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

    const data = await response.arrayBuffer();

    if (data.byteLength > MAX_RESPONSE_SIZE) {
      return apiResponse.error("File too large", 413, "FILE_TOO_LARGE");
    }

    return new Response(data, { headers });
  } catch (error) {
    return apiResponse.internalError(`Proxy error: ${error.message}`);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Referer, Origin",
    },
  });
}
