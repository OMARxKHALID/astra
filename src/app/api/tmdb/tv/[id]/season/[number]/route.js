import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const key = process.env.TMDB_API_KEY;
  const { id, number } = await params;

  if (!key || !id || !number)
    return NextResponse.json({ error: "Missing key, id or number" }, { status: 400 });

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${id}/season/${number}?api_key=${key}&language=en-US`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok)
      return NextResponse.json({ error: "TMDB error" }, { status: 502 });

    const d = await res.json();

    const episodes = (d.episodes || []).map((ep) => ({
      id: ep.id,
      number: ep.episode_number,
      name: ep.name,
      overview: ep.overview,
      airDate: ep.air_date,
      runtime: ep.runtime || null,
      still: ep.still_path
        ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
        : null,
    }));

    return NextResponse.json({ episodes, meta: { season_number: d.season_number } });
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
