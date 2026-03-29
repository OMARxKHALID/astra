import { NextResponse } from "next/server";
import { getBrowseData } from "@/services/tmdb";

export async function GET() {
  const data = await getBrowseData();
  return NextResponse.json(data);
}
