const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const youtubeCache = new Map();
const CACHE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 50;

const decodeHtmlEntities = (str) =>
  str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

export function normalizeYouTubeVideo(item) {
  return {
    id: item.id.videoId,
    title: decodeHtmlEntities(item.snippet.title),
    channel: decodeHtmlEntities(item.snippet.channelTitle),
    thumb:
      item.snippet.thumbnails?.medium?.url ||
      item.snippet.thumbnails?.default?.url,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  };
}

export async function searchYouTube(query, pageToken = null) {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) return { items: [], nextPageToken: null };

  const sanitizedQuery = query?.trim().slice(0, 200) || "";
  if (!sanitizedQuery) return { items: [], nextPageToken: null };

  const cacheKey = `${sanitizedQuery}:${pageToken || "first"}`;
  const cached = youtubeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(sanitizedQuery)}&key=${YOUTUBE_API_KEY}`;
  if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    
    if (!res.ok) return { items: [], nextPageToken: null };

    const data = await res.json();
    if (!data.items) return { items: [], nextPageToken: null };

    const items = data.items.map((item) => normalizeYouTubeVideo(item));
    const result = { items, nextPageToken: data.nextPageToken || null };

    if (youtubeCache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = youtubeCache.keys().next().value;
      youtubeCache.delete(firstKey);
    }
    youtubeCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  } catch (err) {
    return { items: [], nextPageToken: null };
  }
}
