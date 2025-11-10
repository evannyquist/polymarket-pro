import { NextResponse } from "next/server";

// Server-side API route to fetch price history (avoids CORS issues)
// Reference: https://docs.polymarket.com/api-reference/pricing/get-price-history-for-a-traded-token
const POLYMARKET_CLOB_API = "https://clob.polymarket.com";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get("market"); // token ID
    const interval = searchParams.get("interval") || "1d"; // Default to 1 day
    const startTs = searchParams.get("startTs");
    const endTs = searchParams.get("endTs");
    const fidelity = searchParams.get("fidelity");

    if (!market || market.trim() === "") {
      return NextResponse.json(
        { error: "market parameter (token ID) is required" },
        { status: 400 }
      );
    }

    // Build query parameters
    // Format: GET /prices-history?market=clobtokenid&interval=1d
    const trimmedMarket = market.trim();
    
    // Log the token ID for debugging
    console.log("Price history API - Token ID:", trimmedMarket);
    console.log("Price history API - Token ID type:", typeof trimmedMarket, "Length:", trimmedMarket.length);
    
    const params = new URLSearchParams();
    params.append("market", trimmedMarket); // Ensure no whitespace
    
    if (interval) {
      params.append("interval", interval);
    }
    if (startTs) {
      params.append("startTs", startTs);
    }
    if (endTs) {
      params.append("endTs", endTs);
    }
    if (fidelity) {
      params.append("fidelity", fidelity);
    }

    const endpoint = `${POLYMARKET_CLOB_API}/prices-history?${params.toString()}`;
    console.log("Price history API - Request URL:", endpoint);
    
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Polymarket-Pro/1.0",
      },
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });

    console.log("Price history API - Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error("Price history API - Error response:", errorText);
      throw new Error(`CLOB API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in price-history API route:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Internal server error",
        history: []
      },
      { status: 500 }
    );
  }
}

