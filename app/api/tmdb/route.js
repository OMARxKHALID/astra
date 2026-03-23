import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q) return NextResponse.json({});

  const key = process.env.TMDB_API_KEY;
  if (!key) {
    // We return nothing if there's no TMDB key configured, avoiding throwing errors on client
    return NextResponse.json({});
  }

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/multi?api_key=${key}&query=${encodeURIComponent(q)}&language=en-US&page=1&include_adult=false`
    );
    const data = await res.json();
    const items = (data.results || [])
      .filter(r => r.media_type === "movie" || r.media_type === "tv")
      .map(hit => ({
        id: hit.id,
        title: hit.title || hit.name,
        overview: hit.overview,
        poster: hit.poster_path ? `https://image.tmdb.org/t/p/w200${hit.poster_path}` : null,
        backdrop: hit.backdrop_path ? `https://image.tmdb.org/t/p/w1280${hit.backdrop_path}` : null,
        rating: hit.vote_average ? hit.vote_average.toFixed(1) : null,
        type: hit.media_type,
        year: (hit.release_date || hit.first_air_date || "").substring(0, 4)
      }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[TMDB API Error]", err);
    return NextResponse.json({ items: [] });
  }
}
