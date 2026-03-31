import { cache } from "react";
import InfoView from "@/features/content/InfoView";

import {
  getMovieDetails,
  getTVDetails,
  getTVSeasonDetails,
} from "@/services/tmdbDetails";

// [Note] React cache: deduplicates getInfoData between generateMetadata and InfoPage within a single render pass
const getInfoData = cache(async function getInfoData(type, id) {
  try {
    const data =
      type === "tv" ? await getTVDetails(id) : await getMovieDetails(id);
    if (!data) return null;

    if (type === "tv" && data.id) {
      const eps = await getTVSeasonDetails(data.id, 1);
      if (eps) data.initialEpisodes = eps;
    }

    return data;
  } catch (e) {
    console.error("Failed to fetch info data:", e);
    return null;
  }
});

export async function generateMetadata({ params }) {
  const { type, id } = await params;
  const data = await getInfoData(type, id);

  if (!data) return { title: "Content Info" };

  const title = data.title || data.name;
  const description = data.overview?.slice(0, 160) || `Watch ${title} in sync with friends on Astra.`;
  const image = data.backdrop_path 
    ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
    : "/og-image.png";

  return {
    title,
    description,
    keywords: data.genres ? data.genres.join(", ") : "movies, tv shows, streaming",
    alternates: {
      canonical: `/info/${type}/${id}`,
    },
    openGraph: {
      title,
      description,
      images: [image],
      type: type === "movie" ? "video.movie" : "video.tv_show",
      url: `https://astra-sync.vercel.app/info/${type}/${id}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

// Next.js 15 requires awaiting params
export default async function InfoPage({ params }) {
  const unwrappedParams = await params;
  const { type, id } = unwrappedParams;
  const data = await getInfoData(type, id);

  const jsonLd = data ? {
    "@context": "https://schema.org",
    "@type": type === "movie" ? "Movie" : "TVSeries",
    "name": data.title || data.name,
    "description": data.overview,
    "image": `https://image.tmdb.org/t/p/w780${data.poster_path}`,
    "datePublished": data.release_date || data.first_air_date,
    ...(data.rating && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": data.rating,
        "bestRating": "10",
        "ratingCount": data.vote_count || 100
      }
    }),
    ...(data.credits && {
      "actor": data.credits.filter(c => c.role !== "Director").map(actor => ({
        "@type": "Person",
        "name": actor.name
      })),
      "director": data.credits.filter(c => c.role === "Director").map(dir => ({
        "@type": "Person",
        "name": dir.name
      }))
    })
  } : null;

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <InfoView initialData={data} type={type} id={id} />
    </>
  );
}
