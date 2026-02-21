import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";

async function getAutocomplete(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input");
  const trimmed = input?.trim() ?? "";
  if (trimmed.length < 2) {
    return NextResponse.json(
      { error: "input required (min 2 characters)" },
      { status: 400 }
    );
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", trimmed);
  url.searchParams.set("key", key);
  url.searchParams.set("components", "country:il");

  try {
    const res = await fetch(url.toString());
    const data = (await res.json()) as {
      status: string;
      predictions?: Array<{ place_id: string; description: string }>;
      error_message?: string;
    };

    if (data.status === "REQUEST_DENIED" || data.status === "OVER_QUERY_LIMIT") {
      console.error("[places/autocomplete] Google API:", data.status, data.error_message);
      return NextResponse.json(
        { error: data.error_message ?? "Places request failed" },
        { status: 502 }
      );
    }

    const predictions = (data.predictions ?? []).map((p) => ({
      place_id: p.place_id,
      description: p.description ?? "",
    }));

    return NextResponse.json({ predictions });
  } catch (err) {
    console.error("[places/autocomplete] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(getAutocomplete, { allowed: ["driver"] });
