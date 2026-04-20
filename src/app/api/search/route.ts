import { NextRequest } from "next/server";
import { searchArticles } from "@/lib/data";
import { rateLimit } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 30, windowMs: 60_000 }; // 30 req/min per IP

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  const { allowed, remaining, resetAt } = rateLimit(`search:${ip}`, RATE_LIMIT);

  if (!allowed) {
    return Response.json(
      { error: "Zbyt wiele zapytań. Spróbuj za chwilę." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const query = request.nextUrl.searchParams.get("q") || "";

  if (!query.trim()) {
    return Response.json([]);
  }

  const results = await searchArticles(query.trim());
  return Response.json(results, {
    headers: { "X-RateLimit-Remaining": String(remaining) },
  });
}
