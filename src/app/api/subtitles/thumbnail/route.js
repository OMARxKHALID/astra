import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "Missing 'url' parameter" },
        { status: 400 },
      );
    }

    // Vimeo — use oEmbed to get thumbnail_url
    if (url.includes("vimeo.com")) {
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
          return NextResponse.json(
            { thumbnailUrl: data.thumbnail_url || null },
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

    return NextResponse.json({ thumbnailUrl: null });
  } catch (err) {
    console.error("[thumbnail] Error:", err.message);
    return NextResponse.json({ thumbnailUrl: null });
  }
}
