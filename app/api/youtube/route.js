import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const pageToken = searchParams.get("pageToken");
  const q = searchParams.get("q");
  if (!q) return NextResponse.json({ items: [], nextPageToken: null });

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ items: [], nextPageToken: null });

  try {
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(q)}&key=${key}`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!data.items) return NextResponse.json({ items: [], nextPageToken: null });

    const decode = (str) =>
      str
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");

    const items = data.items.map((item) => ({
      id: item.id.videoId,
      title: decode(item.snippet.title),
      channel: decode(item.snippet.channelTitle),
      thumb: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    return NextResponse.json({ items, nextPageToken: data.nextPageToken || null });
  } catch (err) {
    console.error("[YouTube API Error]", err);
    return NextResponse.json({ items: [] });
  }
}
