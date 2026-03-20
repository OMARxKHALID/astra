import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const srtUrl = searchParams.get("url");

    if (!srtUrl) {
      return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
    }

    const srtRes = await fetch(srtUrl);
    if (!srtRes.ok) throw new Error("Failed to download raw subtitle file.");
    const srtText = await srtRes.text();

    // Convert SRT to WebVTT format
    const vttText = "WEBVTT\n\n" + srtText.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");

    return new NextResponse(vttText, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    console.error("Subtitle conversion error:", err);
    return NextResponse.json({ error: "Subtitle proxy failed", details: err.message }, { status: 500 });
  }
}
