const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const IMG_BASE_URL = "https://image.tmdb.org/t/p";

/**
 * Normalizes TMDB image paths to full URLs.
 */
export function getTMDBImageUrl(path, size = "w500") {
  return path ? `${IMG_BASE_URL}/${size}${path}` : null;
}

/**
 * Standard fetcher for TMDB API with caching.
 */
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

/**
 * Normalizes movie/TV items from list responses into a consistent internal format.
 */
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

/**
 * Standard mapping for common details like cast, reviews, and related items.
 */
function mapCommonDetails(d, type) {
  return {
    credits: (d.credits?.cast || []).slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name,
      role: c.character,
      poster: getTMDBImageUrl(c.profile_path, "w185"),
    })),
    reviews: (d.reviews?.results || []).slice(0, 5).map((r) => ({
      id: r.id,
      author: r.author,
      content: r.content,
      rating: r.author_details?.rating,
    })),
    related: (d.recommendations?.results || []).slice(0, 10).map((hit) => ({
      ...normalizeTMDB(hit, hit.media_type || type),
      poster: getTMDBImageUrl(hit.poster_path, "w200"),
    })),
    trailer: (d.videos?.results || []).find((v) => v.type === "Trailer" && v.site === "YouTube")?.key || null,
    providers: parseProviders(d),
  };
}

/**
 * Parses watch providers for a given TMDB response.
 */
function parseProviders(d) {
  const pRes = d["watch/providers"]?.results || {};
  const localP = pRes.US || Object.values(pRes)[0] || {};
  const flatrate = localP.flatrate || localP.free || localP.ads || [];
  return flatrate.map((p) => ({
    id: p.provider_id,
    name: p.provider_name,
    logo: getTMDBImageUrl(p.logo_path, "w92"),
  }));
}

/**
 * Fetches and maps detailed movie information.
 */
export async function getMovieDetails(id) {
  const d = await fetchTMDB(`movie/${id}`, "&append_to_response=credits,recommendations,reviews,videos,watch/providers");
  if (!d) return null;

  const runtimeStr = d.runtime
    ? d.runtime >= 60
      ? `${Math.floor(d.runtime / 60)}hr ${d.runtime % 60}min`
      : `${d.runtime}min`
    : null;

  const releaseDate = d.release_date
    ? new Date(d.release_date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return {
    ...normalizeTMDB(d, "movie"),
    tagline: d.tagline || null,
    runtime: runtimeStr,
    release: releaseDate,
    genres: (d.genres || []).map((g) => g.name),
    collection: d.belongs_to_collection?.name || null,
    languages: (d.spoken_languages || []).map((l) => l.english_name).join(", "),
    countries: (d.production_countries || []).map((c) => c.name).join(", "),
    companies: (d.production_companies || []).map((c) => c.name).join(", "),
    poster: getTMDBImageUrl(d.poster_path, "w500"),
    ...mapCommonDetails(d, "movie"),
  };
}

/**
 * Fetches and maps detailed TV show information.
 */
export async function getTVDetails(id) {
  const d = await fetchTMDB(`tv/${id}`, "&append_to_response=credits,recommendations,reviews,videos,watch/providers");
  if (!d) return null;

  const seasons = (d.seasons || [])
    .filter((s) => s.season_number > 0)
    .map((s) => ({
      number: s.season_number,
      name: s.name,
      episodeCount: s.episode_count,
      poster: getTMDBImageUrl(s.poster_path, "w185"),
      airDate: s.air_date || null,
    }));

  return {
    ...normalizeTMDB(d, "tv"),
    tagline: d.tagline || null,
    runtime: d.episode_run_time?.[0] ? `${d.episode_run_time[0]}min` : null,
    genres: (d.genres || []).map((g) => g.name),
    languages: (d.spoken_languages || []).map((l) => l.english_name).join(", "),
    countries: (d.production_countries || []).map((c) => c.name).join(", "),
    companies: (d.production_companies || []).map((c) => c.name).join(", "),
    poster: getTMDBImageUrl(d.poster_path, "w500"),
    status: d.status,
    episodes: d.number_of_episodes,
    lastAirDate: d.last_air_date,
    seasons,
    ...mapCommonDetails(d, "tv"),
  };
}

/**
 * Fetches episodes for a specific TV show season.
 */
export async function getSeasonData(id, number) {
  const data = await fetchTMDB(`tv/${id}/season/${number}`);
  if (!data) return null;

  const episodes = (data.episodes || []).map((ep) => ({
    id: ep.id,
    number: ep.episode_number,
    name: ep.name,
    overview: ep.overview,
    airDate: ep.air_date,
    runtime: ep.runtime || null,
    still: getTMDBImageUrl(ep.still_path, "w300"),
  }));

  return {
    episodes,
    meta: {
      season_number: data.season_number,
      name: data.name || `Season ${data.season_number}`,
      overview: data.overview || "",
    },
  };
}

/**
 * Compatibility alias for getSeasonData returning only episodes.
 */
export async function getTVSeasonDetails(id, seasonNumber) {
  const res = await getSeasonData(id, seasonNumber);
  return res ? res.episodes : null;
}

/**
 * Fetches data for the home/browse view.
 */
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
