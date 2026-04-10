import { fetchTMDB, IMG_BASE_URL } from "./tmdb";

const getImageUrl = (path, size = "original") => 
  path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;

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
    logo: getImageUrl(p.logo_path, "w92"),
  }));
}

/**
 * Common mapping for credits, reviews, and related items.
 */
const mapCommonDetails = (d, type) => ({
  credits: (d.credits?.cast || []).slice(0, 10).map((c) => ({
    id: c.id,
    name: c.name,
    role: c.character,
    poster: getImageUrl(c.profile_path, "w185"),
  })),
  reviews: (d.reviews?.results || []).slice(0, 5).map((r) => ({
    id: r.id,
    author: r.author,
    content: r.content,
    rating: r.author_details?.rating,
  })),
  related: (d.recommendations?.results || []).slice(0, 10).map((hit) => ({
    id: hit.id,
    title: hit.title || hit.name,
    poster: getImageUrl(hit.poster_path, "w200"),
    type: hit.media_type || type,
    rating: hit.vote_average ? parseFloat(hit.vote_average.toFixed(1)) : null,
  })),
  trailer: (d.videos?.results || []).find((v) => v.type === "Trailer" && v.site === "YouTube")?.key || null,
  providers: parseProviders(d),
});

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
    id: d.id,
    title: d.title,
    overview: d.overview,
    tagline: d.tagline || null,
    rating: d.vote_average ? parseFloat(d.vote_average.toFixed(1)) : null,
    year: (d.release_date || "").slice(0, 4),
    runtime: runtimeStr,
    release: releaseDate,
    genres: (d.genres || []).map((g) => g.name),
    collection: d.belongs_to_collection?.name || null,
    languages: (d.spoken_languages || []).map((l) => l.english_name).join(", "),
    countries: (d.production_countries || []).map((c) => c.name).join(", "),
    companies: (d.production_companies || []).map((c) => c.name).join(", "),
    poster: getImageUrl(d.poster_path, "w500"),
    backdrop: getImageUrl(d.backdrop_path, "original"),
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
      poster: getImageUrl(s.poster_path, "w185"),
      airDate: s.air_date || null,
    }));

  return {
    id: d.id,
    title: d.name,
    overview: d.overview,
    tagline: d.tagline || null,
    rating: d.vote_average ? parseFloat(d.vote_average.toFixed(1)) : null,
    year: (d.first_air_date || "").slice(0, 4),
    runtime: d.episode_run_time?.[0] ? `${d.episode_run_time[0]}min` : null,
    genres: (d.genres || []).map((g) => g.name),
    languages: (d.spoken_languages || []).map((l) => l.english_name).join(", "),
    countries: (d.production_countries || []).map((c) => c.name).join(", "),
    companies: (d.production_companies || []).map((c) => c.name).join(", "),
    poster: getImageUrl(d.poster_path, "w500"),
    backdrop: getImageUrl(d.backdrop_path, "original"),
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
export async function getTVSeasonDetails(id, seasonNumber) {
  const d = await fetchTMDB(`tv/${id}/season/${seasonNumber}`);
  if (!d) return null;
  return (d.episodes || []).map((ep) => ({
    id: ep.id,
    number: ep.episode_number,
    name: ep.name,
    overview: ep.overview,
    airDate: ep.air_date,
    runtime: ep.runtime || null,
    still: getImageUrl(ep.still_path, "w300"),
  }));
}
