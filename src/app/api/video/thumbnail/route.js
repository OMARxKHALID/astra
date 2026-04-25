import { apiResponse } from "@/utils/apiResponse";

function isValidVimeoUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    return url.hostname === "vimeo.com" || url.hostname.endsWith(".vimeo.com");
  } catch {
    return false;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url")?.slice(0, 500) || "";

    if (!url) {
      return apiResponse.badRequest("Missing 'url' parameter");
    }

    // Vimeo — use oEmbed to get thumbnail_url
    if (url.includes("vimeo.com") && isValidVimeoUrl(url)) {
      try {
        const oembedRes = await fetch(
          `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
          {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(3000),
          },
        );
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          return apiResponse.success(
            { thumbnailUrl: data.thumbnail_url || null },
            200,
            {
              headers: {
                // Thumbnail URLs are stable — cache aggressively
                "Cache-Control": "public, max-age=3600, s-maxage=3600",
              },
            },
          );
        }
      } catch {
        // oEmbed fetch failed — fall through to null
      }
    }

    return apiResponse.success({ thumbnailUrl: null });
  } catch (err) {
    console.error("[thumbnail] Error:", err);
    return apiResponse.success({ thumbnailUrl: null });
  }
}
