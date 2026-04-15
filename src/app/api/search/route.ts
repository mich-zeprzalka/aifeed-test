import { NextRequest } from "next/server";
import { searchArticles } from "@/lib/data";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "";

  if (!query.trim()) {
    return Response.json([]);
  }

  const results = await searchArticles(query.trim());
  return Response.json(results);
}
