import { NextResponse } from "next/server";

const API_KEY =
  process.env.OPENSUBTITLES_KEY || "Zff4vJKGx6hFiW02ouPLV1iXQCB3VjL1";
const API_BASE = "https://api.opensubtitles.com/api/v1";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const lang = searchParams.get("lang") || "en";

    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const headers = {
      "Api-Key": API_KEY,
      "User-Agent": "WatchTogether v1",
      "Content-Type": "application/json",
    };

    // Go straight to text query — skip the slow per-file hash search
    const res = await fetch(
      `${API_BASE}/subtitles?query=${encodeURIComponent(query.trim())}&languages=${lang}&per_page=20`,
      { headers, signal: AbortSignal.timeout(6000) },
    );

    if (!res.ok) {
      throw new Error(`OpenSubtitles API error: ${res.status}`);
    }

    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      return NextResponse.json({ subtitles: [] });
    }

    const subtitles = data.data
      .filter((s) => s.attributes?.files?.length > 0)
      .map((s) => ({
        id: s.id,
        label: [
          s.attributes.feature_details?.title ||
            s.attributes.release ||
            "Unknown",
          s.attributes.language && `[${s.attributes.language.toUpperCase()}]`,
          s.attributes.feature_details?.year &&
            `(${s.attributes.feature_details.year})`,
        ]
          .filter(Boolean)
          .join(" "),
        url: String(s.attributes.files[0].file_id),
      }));

    return NextResponse.json({ subtitles });
  } catch (err) {
    console.error("[subtitles/search]", err.message);
    return NextResponse.json(
      { error: err.message || "Search failed" },
      { status: 500 },
    );
  }
}
