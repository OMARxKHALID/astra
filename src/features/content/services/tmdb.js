const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE_URL = "https://image.tmdb.org/t/p";

export function getTMDBImageUrl(path, size = "w500") {
  return path ? `${IMG_BASE_URL}/${size}${path}` : null;
}

export function normalizeTMDB(item, forceType) {
  const isTV =
    forceType === "tv" ||
    (!forceType &&
      (item.media_type === "tv" || item.first_air_date !== undefined || item.name !== undefined));
  
  return {
    id: item.id,
    type: isTV ? "tv" : "movie",
    title: item.title || item.name || "Untitled",
    overview: item.overview || "",
    poster: getTMDBImageUrl(item.poster_path, "w342"),
    backdrop: getTMDBImageUrl(item.backdrop_path, "original"),
    backdropMd: getTMDBImageUrl(item.backdrop_path, "w1280"),
    rating: item.vote_average ? parseFloat(item.vote_average.toFixed(1)) : null,
    year: (item.release_date || item.first_air_date || "").slice(0, 4),
    genreIds: item.genre_ids || [],
  };
}

export async function fetchTMDB(endpoint, query = "") {
  if (!TMDB_API_KEY) return null;
  const sanitizedQuery = query?.slice(0, 500) || "";
  const url = `${TMDB_BASE_URL}/${endpoint}?api_key=${TMDB_API_KEY}${sanitizedQuery}`;
  try {
    const res = await fetch(url, { 
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    return null;
  }
}
export async function getBrowseData() {
  const [trending, topMovies, topTV, animeTV, animeMovies] = await Promise.all([
    fetchTMDB("trending/all/week"),
    fetchTMDB("movie/top_rated"),
    fetchTMDB("tv/top_rated"),
    fetchTMDB("discover/tv", "&with_genres=16&with_keywords=210024&sort_by=popularity.desc"),
    fetchTMDB("discover/movie", "&with_genres=16&with_keywords=210024&sort_by=popularity.desc"),
  ]);

  const animeAll = [
    ...(animeTV?.results || []).map((i) => ({ ...normalizeTMDB(i, "tv"), isAnime: true })),
    ...(animeMovies?.results || []).map((i) => ({ ...normalizeTMDB(i, "movie"), isAnime: true })),
  ];
  const seen = new Set();
  const animeDeduped = animeAll.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  }).slice(0, 20);

  return {
    hero: (trending?.results || []).slice(0, 8).map((i) => normalizeTMDB(i)),
    trending: (trending?.results || []).slice(0, 20).map((i) => normalizeTMDB(i)),
    topMovies: (topMovies?.results || []).slice(0, 20).map((i) => normalizeTMDB(i, "movie")),
    topSeries: (topTV?.results || []).slice(0, 20).map((i) => normalizeTMDB(i, "tv")),
    anime: animeDeduped,
  };
}
