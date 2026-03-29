import InfoView from "@/features/content/InfoView";

import {
  getMovieDetails,
  getTVDetails,
  getTVSeasonDetails,
} from "@/services/tmdbDetails";

async function getInfoData(type, id) {
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
}

// Next.js 15 requires awaiting params
export default async function InfoPage({ params }) {
  const unwrappedParams = await params;
  const { type, id } = unwrappedParams;
  const data = await getInfoData(type, id);

  return <InfoView initialData={data} type={type} id={id} />;
}
