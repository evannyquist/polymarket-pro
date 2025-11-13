import { NextResponse } from "next/server";

// Proxy endpoint for Binance klines/candlestick API
// Reference: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "BTCUSDT";
    const interval = searchParams.get("interval") || "1h";
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");
    const limit = searchParams.get("limit") || "1";

    // Build query parameters
    const params = new URLSearchParams({
      symbol,
      interval,
      limit,
    });

    if (startTime) {
      params.append("startTime", startTime);
    }
    if (endTime) {
      params.append("endTime", endTime);
    }

    // Fetch kline data from Binance
    // GET /api/v3/klines
    // Response format: [[Open time (0), Open (1), High (2), Low (3), Close (4), Volume (5), Close time (6), ...], ...]
    // Using data-api.binance.vision for public market data (no API keys needed)
    const binanceUrl = `https://data-api.binance.vision/api/v3/klines?${params.toString()}`;
    
    const response = await fetch(binanceUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Binance API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in Binance klines API route:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to fetch klines from Binance"
      },
      { status: 500 }
    );
  }
}

