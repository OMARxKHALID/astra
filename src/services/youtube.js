const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

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
  if (!YOUTUBE_API_KEY) return { items: [], nextPageToken: null };

  let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
  if (pageToken) url += `&pageToken=${pageToken}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return { items: [], nextPageToken: null };

    const data = await res.json();
    if (!data.items) return { items: [], nextPageToken: null };

    const items = data.items.map((item) => normalizeYouTubeVideo(item));
    return { items, nextPageToken: data.nextPageToken || null };
  } catch (err) {
    return { items: [], nextPageToken: null };
  }
}
