import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";

async function getDetails(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("place_id");
  const trimmed = placeId?.trim() ?? "";
  if (!trimmed) {
    return NextResponse.json(
      { error: "place_id required" },
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

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", trimmed);
  url.searchParams.set("key", key);
  url.searchParams.set("fields", "formatted_address,geometry");

  try {
    const res = await fetch(url.toString());
    const data = (await res.json()) as {
      status: string;
      result?: {
        formatted_address?: string;
        geometry?: { location?: { lat: number; lng: number } };
      };
      error_message?: string;
    };

    if (data.status === "REQUEST_DENIED" || data.status === "OVER_QUERY_LIMIT") {
      console.error("[places/details] Google API:", data.status, data.error_message);
      return NextResponse.json(
        { error: data.error_message ?? "Place details request failed" },
        { status: 502 }
      );
    }

    if (data.status !== "OK" || !data.result) {
      return NextResponse.json(
        { error: "Place not found" },
        { status: 404 }
      );
    }

    const loc = data.result.geometry?.location;
    if (loc == null || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) {
      return NextResponse.json(
        { error: "Place has no geometry" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      formattedAddress: data.result.formatted_address ?? "",
      lat: Number(loc.lat),
      lng: Number(loc.lng),
    });
  } catch (err) {
    console.error("[places/details] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch place details" },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(getDetails, { allowed: ["driver"] });
