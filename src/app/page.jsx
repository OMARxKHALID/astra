import { getBrowseData } from "@/features/content/services/tmdb";
import { NEXT_PUBLIC_SITE_URL } from "@/constants/config";
import HomeView from "@/features/content/HomeView";

export const metadata = {
  title: "Astra | Watch Parties with Friends",
  description: "Astra is a real-time video synchronization platform for watch parties. Stream movies, TV shows, and anime with friends while keeping everyone in perfect sync.",
  keywords: ["watch party", "sync streaming", "movie streaming", "anime", "tv shows", "Astra", "real-time sync", "watch together"],
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
