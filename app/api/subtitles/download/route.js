import { NextResponse } from "next/server";

const API_KEY = process.env.OPENSUBTITLES_KEY || "Zff4vJKGx6hFiW02ouPLV1iXQCB3VjL1";
const API_BASE = "https://api.opensubtitles.com/api/v1";

/**
 * Robust SRT to WebVTT converter.
 * Includes CRLF (Windows) normalization and timestamp correction.
 */
function srtToVtt(srt) {
  // Normalize line endings (\r\n -> \n)
  let vtt = srt.replace(/\r\n/g, "\n").trim();
  
  // Heuristic: If it already looks like WebVTT, return as is
  if (vtt.startsWith("WEBVTT")) return vtt;

  // Prepend header and fix timestamps
  // SRT: 00:00:20,000 --> 00:00:24,400
  // VTT: 00:00:20.000 --> 00:00:24.400
  vtt = "WEBVTT\n\n" + vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  
  return vtt;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const subUrlOrId = searchParams.get("url");

    if (!subUrlOrId) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    let subtitleContent = "";
    
    // ── Check if numeric file_id ───────────────────────────────────────────
    const isFileId = /^\d+$/.test(subUrlOrId.trim());

    if (isFileId) {
      // ── Case 1: OpenSubtitles file_id ─────────────────────────────────────
      const response = await fetch(`${API_BASE}/download`, {
        method: "POST",
        headers: {
          "Api-Key": API_KEY,
          "User-Agent": "WatchTogether v1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file_id: parseInt(subUrlOrId) }),
      });

      if (!response.ok) {
        throw new Error(`OpenSubtitles download failed: ${response.status}`);
      }

      const { link } = await response.json();
      if (!link) throw new Error("No download link returned");

      const fileResp = await fetch(link);
      subtitleContent = await fileResp.text();
    } else {
      // ── Case 2: Direct URL Proxy ──────────────────────────────────────────
      const resp = await fetch(subUrlOrId);
      if (!resp.ok) throw new Error(`External download failed: ${resp.status}`);
      
      // Heuristic: Check Content-Type or Extension to skip conversion if already VTT
      const contentType = resp.headers.get("Content-Type") || "";
      const isAlreadyVtt = contentType.includes("vtt") || subUrlOrId.toLowerCase().endsWith(".vtt");
      
      subtitleContent = await resp.text();
      
      if (!isAlreadyVtt && subtitleContent.includes("-->")) {
        subtitleContent = srtToVtt(subtitleContent);
      }
    }

    return new Response(subtitleContent, {
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*", // critical for cross-origin subtitle loading
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
