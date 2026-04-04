import { NextResponse } from "next/server";

const ALLOWED_PROTOCOLS = ["https:", "http:"];
const BLOCKED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];

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
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url")?.slice(0, 1000) || "";

    if (!url) {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 },
      );
    }

    const decodedUrl = decodeURIComponent(url);
    if (!isValidUrl(decodedUrl)) {
      return NextResponse.json(
        { error: "Invalid or disallowed URL" },
        { status: 400 },
      );
    }

    const res = await fetch(decodedUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000),
    });

    return NextResponse.json({
      contentType: res.headers.get("content-type") || "",
      contentLength: res.headers.get("content-length") || "",
      status: res.status,
      ok: res.ok,
    });
  } catch (err) {
    return NextResponse.json(
      { contentType: "", error: err.message },
      { status: 500 },
    );
  }
}
