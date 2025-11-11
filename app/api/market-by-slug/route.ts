import { NextResponse } from "next/server";

// Server-side API route to fetch market by slug (avoids CORS issues)
// Reference: 
// - https://docs.polymarket.com/api-reference/events/list-events
// - https://docs.polymarket.com/api-reference/markets/list-markets
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug parameter is required" },
        { status: 400 }
      );
    }

    // Prioritize events endpoint per documentation
    // Reference: https://docs.polymarket.com/api-reference/events/get-event-by-slug
    // GET /events/slug/{slug}
    const eventsEndpoint = `https://gamma-api.polymarket.com/events/slug/${encodeURIComponent(slug)}`;
    
    console.log("Fetching event from:", eventsEndpoint);
    const eventsResponse = await fetch(eventsEndpoint, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Polymarket-Pro/1.0",
      },
      next: { revalidate: 60 },
    });

    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json();
      console.log("Events API response status:", eventsResponse.status);
      console.log("Events API response has markets:", eventsData.markets ? `Yes, ${Array.isArray(eventsData.markets) ? eventsData.markets.length : 'not array'}` : "No");
      return NextResponse.json(eventsData);
    }

    // Fallback to markets endpoint if events endpoint fails
    // GET /markets?slug=<slug>
    const marketsEndpoint = `https://gamma-api.polymarket.com/markets?slug=${encodeURIComponent(slug)}`;
    
    console.log("Events endpoint failed, trying markets endpoint:", marketsEndpoint);
    const marketsResponse = await fetch(marketsEndpoint, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Polymarket-Pro/1.0",
      },
      next: { revalidate: 60 },
    });

    if (marketsResponse.ok) {
      const marketsData = await marketsResponse.json();
      // Markets endpoint returns an array
      if (Array.isArray(marketsData) && marketsData.length > 0) {
        return NextResponse.json(marketsData[0]); // Return first market
      }
      // If it's not an array, return as-is
      return NextResponse.json(marketsData);
    }

    throw new Error(`Both events and markets endpoints failed. Events: ${eventsResponse.status}, Markets: ${marketsResponse.status}`);
  } catch (error) {
    console.error("Error in market-by-slug API route:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  }
}

