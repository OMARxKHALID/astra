import { getBrowseData } from "@/services/tmdb";
import HomeView from "@/features/content/HomeView";

export default async function HomePage() {
  const data = await getBrowseData();
  return <HomeView initialData={data} />;
}
