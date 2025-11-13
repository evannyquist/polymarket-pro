import { NextResponse } from "next/server";

// Proxy endpoint for Binance price API
// Reference: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "BTCUSDT";

    // Fetch current price from Binance
    // GET /api/v3/ticker/price
    // Using data-api.binance.vision for public market data (no API keys needed)
    const binanceUrl = `https://data-api.binance.vision/api/v3/ticker/price?symbol=${symbol}`;
    
    const response = await fetch(binanceUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 10 }, // Cache for 10 seconds
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Binance API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in Binance price API route:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to fetch price from Binance"
      },
      { status: 500 }
    );
  }
}

