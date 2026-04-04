import { NextResponse } from "next/server";

const ALLOWED_PROTOCOLS = ["https:"];
const BLOCKED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];
const MAX_RESPONSE_SIZE = 100 * 1024 * 1024; // 100MB

function isValidUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) return false;
    if (BLOCKED_HOSTS.includes(url.hostname)) return false;
    if (url.hostname.startsWith("127.") || url.hostname.startsWith("10.") || url.hostname.startsWith("192.168.")) return false;
    return true;
  } catch {
    return false;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url")?.slice(0, 1000) || "";

  if (!url) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  try {
    const targetUrl = decodeURIComponent(url);
    
    if (!isValidUrl(targetUrl)) {
      return NextResponse.json({ error: "Invalid or disallowed URL" }, { status: 400 });
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Referer": "https://123movienow.cc/",
        "Origin": "https://123movienow.cc",
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Proxy fetch failed: ${response.status}` },
        { status: response.status }
      );
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Range, Referer, Origin");
    headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Range");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Type", response.headers.get("content-type") || "video/mp4");
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

    const data = await response.arrayBuffer();

    if (data.byteLength > MAX_RESPONSE_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

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