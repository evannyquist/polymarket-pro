import { NextResponse } from "next/server";

// Server-side API route to fetch tokens by condition ID (avoids CORS issues)
// This uses the CLOB /markets endpoint to get token IDs from condition IDs
// The CLOB API doesn't have a /tokens endpoint, so we fetch markets and extract tokens
const POLYMARKET_CLOB_API = "https://clob.polymarket.com";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conditionId = searchParams.get("condition_id");

    if (!conditionId) {
      return NextResponse.json(
        { error: "condition_id parameter is required" },
        { status: 400 }
      );
    }

    // Fetch markets from CLOB API
    // The CLOB API doesn't support filtering by condition_id directly,
    // so we need to paginate through markets to find the one we need
    const endpoint = `${POLYMARKET_CLOB_API}/markets`;
    let foundMarket = null;
    let nextCursor = "";
    const maxPages = 20; // Limit to prevent infinite loops
    
    // Paginate through markets to find the one with matching condition_id
    for (let page = 0; page < maxPages && !foundMarket; page++) {
      const url = nextCursor ? `${endpoint}?next_cursor=${nextCursor}` : endpoint;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "Polymarket-Pro/1.0",
        },
        next: { revalidate: 60 },
      });

      if (!response.ok) {
        if (page === 0) {
          // If first request fails, throw error
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`CLOB API returned ${response.status}: ${errorText}`);
        }
        break; // If later pages fail, stop searching
      }

      const data = await response.json();
      const markets = data.data || [];
      
      // Find the market with matching condition_id
      foundMarket = markets.find((m: any) => 
        (m.condition_id || "") === conditionId
      );
      
      if (foundMarket) {
        break; // Found it!
      }
      
      // Get next cursor for pagination
      nextCursor = data.next_cursor || "";
      if (!nextCursor || nextCursor === "LTE=") {
        break; // End of data
      }
    }
    
    if (!foundMarket) {
      return NextResponse.json(
        { error: `No market found for condition_id: ${conditionId}` },
        { status: 404 }
      );
    }
    
    // Extract tokens from the market
    const tokens = foundMarket.tokens || [];
    
    if (tokens.length === 0) {
      return NextResponse.json(
        { error: `No tokens found for condition_id: ${conditionId}` },
        { status: 404 }
      );
    }
    
    // Return the tokens array
    return NextResponse.json(tokens);
  } catch (error) {
    console.error("Error in tokens API route:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  }
}

