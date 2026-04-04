import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  try {
    const targetUrl = decodeURIComponent(url);

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Referer": "https://123movienow.cc/",
        "Origin": "https://123movienow.cc",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Proxy fetch failed: ${response.status}` },
        { status: response.status }
      );
    }

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Range, Referer, Origin");
    headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Range");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Type", response.headers.get("Content-Type") || "video/mp4");
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

    const data = await response.arrayBuffer();

    return new NextResponse(data, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: `Proxy error: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Referer, Origin",
    },
  });
}