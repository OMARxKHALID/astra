import { NextResponse } from "next/server";
import { gunzipSync } from "zlib";
import { withRateLimit } from "@/lib/rateLimit";
import { isValidUrl } from "@/lib/ssrf";

const API_KEY = process.env.OPENSUBTITLES_KEY;
const API_BASE = "https://api.opensubtitles.com/api/v1";
const MAX_RESPONSE_SIZE = 2 * 1024 * 1024;

export async function GET(request) {
  try {
    const limited = await withRateLimit(request, { key: "subtitles:download", requests: 10, window: "1 m" });
    if (limited) return limited;

    if (!API_KEY) {
      return NextResponse.json(
        { error: "OpenSubtitles API key not configured" },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const subUrlOrId = searchParams.get("url")?.slice(0, 500) || "";

    if (!subUrlOrId) {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 },
      );
    }

    let finalDownloadUrl = subUrlOrId;

    const isFileId = /^\d+$/.test(subUrlOrId.trim());
    if (isFileId) {
      const dlRes = await fetch(`${API_BASE}/download`, {
        method: "POST",
        headers: {
          "Api-Key": API_KEY,
          "User-Agent": "Astra v1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file_id: parseInt(subUrlOrId, 10) }),
        signal: AbortSignal.timeout(10000),
      });
      
      if (!dlRes.ok)
        throw new Error(`OpenSubtitles download API: ${dlRes.status}`);
      const dlData = await dlRes.json();
      if (!dlData.link) throw new Error("No download link from OpenSubtitles");
      finalDownloadUrl = dlData.link;
    } else {
      // [Note] SSRF guard: direct URLs must pass the same IP blocklist as /api/proxy
      if (!(await isValidUrl(finalDownloadUrl))) {
        return NextResponse.json(
          { error: "Invalid or disallowed URL" },
          { status: 400 },
        );
      }
    }

    const res = await fetch(finalDownloadUrl, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Subtitle fetch failed: ${res.status}`);

    const contentType = res.headers.get("content-type") || "";

    const buffer = await res.arrayBuffer();
    
    if (buffer.byteLength > MAX_RESPONSE_SIZE) {
      throw new Error("Subtitle file too large");
    }
    
    let rawData = Buffer.from(buffer);

    const isGzip =
      contentType.includes("gzip") ||
      finalDownloadUrl.endsWith(".gz") ||
      (rawData[0] === 0x1f && rawData[1] === 0x8b);
    if (isGzip) {
      try {
        rawData = gunzipSync(rawData);
      } catch (e) {
        // [Note] gzip decompression failed — proceed with raw data
      }
    }

    if (contentType.includes("vtt") || finalDownloadUrl.endsWith(".vtt")) {
      return new NextResponse(rawData, {
        status: 200,
        headers: {
          "Content-Type": "text/vtt; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(rawData);
    } catch {
      text = new TextDecoder("windows-1252").decode(rawData);
    }

    text = text.replace(/^\uFEFF/, "");

    if (text.trimStart().startsWith("WEBVTT")) {
      return new NextResponse(text, {
        status: 200,
        headers: {
          "Content-Type": "text/vtt; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const vtt =
      "WEBVTT\n\n" +
      text
        .trim()
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n\n(\d+)\n/g, "\n\n")
        .replace(/\n(\d+)\n(\d+:\d{2}:\d{2}),(\d{3})/g, "\n$2.$3")
        .replace(/^(\d+)\n(\d+:\d{2}:\d{2}),(\d{3})/gm, "$2.$3");

    return new NextResponse(vtt, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Download failed" },
      { status: 500 },
    );
  }
}
