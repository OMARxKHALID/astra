import { getBrowseData } from "@/features/content/services/tmdb";
import { NEXT_PUBLIC_SITE_URL } from "@/constants/config";
import HomeView from "@/features/content/HomeView";

export const metadata = {
  title: "Astra | Stream Movies, TV Shows & Anime",
  description: "Explore a massive library of movies, TV shows, and anime. Stream content in high quality with a premium, social viewing experience.",
  keywords: ["streaming portal", "movies online", "tv shows", "watch anime", "watch party", "synced viewing", "Astra"],
};

export default async function HomePage() {
  const data = await getBrowseData();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Astra",
    "url": NEXT_PUBLIC_SITE_URL,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${NEXT_PUBLIC_SITE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeView initialData={data} />
    </>
  );
}
