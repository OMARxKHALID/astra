import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
    }

    const cinemetaUrl = `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(query)}.json`;
    const searchRes = await fetch(cinemetaUrl);
    if (!searchRes.ok) throw new Error("Failed to search metadata.");
    const searchData = await searchRes.json();
    if (!searchData.metas || searchData.metas.length === 0) {
      return NextResponse.json({ error: `Could not find "${query}"` }, { status: 404 });
    }

    const imdbId = searchData.metas[0].imdb_id;
    const movieTitle = searchData.metas[0].name;

    const opensubsUrl = `https://opensubtitles-v3.strem.io/subtitles/movie/${imdbId}.json`;
    const subsRes = await fetch(opensubsUrl);
    if (!subsRes.ok) throw new Error("Failed to connect to subtitle database.");
    const subsData = await subsRes.json();
    if (!subsData.subtitles || subsData.subtitles.length === 0) {
      return NextResponse.json({ error: "No subtitles found." }, { status: 404 });
    }


    const engSubs = subsData.subtitles.filter(s => s.lang === "eng" || s.lang === "en" || s.lang.toLowerCase().includes("english"));
    if (engSubs.length === 0) {
      return NextResponse.json({ error: "No English subtitles found." }, { status: 404 });
    }


    const results = engSubs.slice(0, 20).map((s, index) => ({
      id: s.id || `sub_${index}`,
      label: `${movieTitle} - English Track ${index + 1}`,
      url: s.url
    }));

    return NextResponse.json({
      title: movieTitle,
      subtitles: results,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
