import { NextResponse } from "next/server";
import { getBrowseData } from "@/services/tmdb";

export async function GET() {
  try {
    const data = await getBrowseData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to load content" }, { status: 500 });
  }
}
