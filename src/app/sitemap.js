import { NEXT_PUBLIC_SITE_URL } from "@/constants/config";

export default async function sitemap() {
  return [
    {
      url: NEXT_PUBLIC_SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${NEXT_PUBLIC_SITE_URL}/watch`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
