import { NextResponse } from "next/server";
import { gunzipSync } from "zlib";

const API_KEY =
  process.env.OPENSUBTITLES_KEY || "Zff4vJKGx6hFiW02ouPLV1iXQCB3VjL1";
const API_BASE = "https://api.opensubtitles.com/api/v1";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const subUrlOrId = searchParams.get("url");

    if (!subUrlOrId) {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 },
      );
    }

    let finalDownloadUrl = subUrlOrId;

    // [Note] OpenSubtitles: use file_id to request a temporary download link
    const isFileId = /^\d+$/.test(subUrlOrId.trim());
    if (isFileId) {
      const dlRes = await fetch(`${API_BASE}/download`, {
        method: "POST",
        headers: {
          "Api-Key": API_KEY,
          "User-Agent": "WatchTogether v1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file_id: parseInt(subUrlOrId, 10) }),
      });
      if (!dlRes.ok)
        throw new Error(`OpenSubtitles download API: ${dlRes.status}`);
      const dlData = await dlRes.json();
      if (!dlData.link) throw new Error("No download link from OpenSubtitles");
      finalDownloadUrl = dlData.link;
    }

    const res = await fetch(finalDownloadUrl);
    if (!res.ok) throw new Error(`Subtitle fetch failed: ${res.status}`);

    const contentType = res.headers.get("content-type") || "";

    // Get raw bytes — needed for gzip detection and proper charset decoding
    const buffer = await res.arrayBuffer();
    let rawData = Buffer.from(buffer);

    // [Note] GZIP detection: OpenSubtitles serves compressed files by default
    const isGzip =
      contentType.includes("gzip") ||
      finalDownloadUrl.endsWith(".gz") ||
      (rawData[0] === 0x1f && rawData[1] === 0x8b); // magic bytes check
    if (isGzip) {
      try {
        rawData = gunzipSync(rawData);
      } catch {}
    }

    // Fix 2: Already VTT — return as-is
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

    // [Note] Charset: fall back to windows-1252 for non-UTF8 SRT files
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(rawData);
    } catch {
      text = new TextDecoder("windows-1252").decode(rawData);
    }

    // Strip BOM if present (some encoders add \uFEFF at start)
    text = text.replace(/^\uFEFF/, "");

    // Fix 4: Already WEBVTT — return unchanged
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

    // [Note] SRT to VTT: robust regex handles varied spacing and hours formatting
    const vtt =
      "WEBVTT\n\n" +
      text
        .trim()
        .replace(/\r\n/g, "\n")
        .replace(/(\d+:\d{2}:\d{2}),(\d{3})/g, "$1.$2");

    return new NextResponse(vtt, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[subtitles/download]", err.message);
    return NextResponse.json(
      { error: err.message || "Download failed" },
      { status: 500 },
    );
  }
}
