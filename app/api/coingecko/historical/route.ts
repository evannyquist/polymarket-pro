import { NextRequest, NextResponse } from "next/server";

/**
 * Fetch historical Bitcoin price from CoinGecko
 * Free tier allows 10-30 calls/minute
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const timestamp = searchParams.get("timestamp"); // Unix timestamp in seconds
  
  if (!timestamp) {
    return NextResponse.json(
      { error: "Missing timestamp parameter" },
      { status: 400 }
    );
  }
  
  try {
    // CoinGecko market_chart API - returns hourly data for queries > 90 days ago
    // For recent data, it returns 5-minute granularity
    const timestampMs = parseInt(timestamp) * 1000;
    
    // Get data from a range around our target time
    const fromTimestamp = Math.floor(timestampMs / 1000) - 300; // 5 minutes before
    const toTimestamp = Math.floor(timestampMs / 1000) + 300; // 5 minutes after
    
    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`;
    
    console.log("Fetching from CoinGecko:", url);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // data.prices is an array of [timestamp_ms, price]
    if (!data.prices || data.prices.length === 0) {
      return NextResponse.json(
        { error: "No price data available for this timestamp" },
        { status: 404 }
      );
    }
    
    // Find the closest price to our target timestamp
    const targetTime = timestampMs;
    let closestPrice = data.prices[0];
    let minDiff = Math.abs(data.prices[0][0] - targetTime);
    
    for (const pricePoint of data.prices) {
      const diff = Math.abs(pricePoint[0] - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestPrice = pricePoint;
      }
    }
    
    console.log("CoinGecko result:", {
      targetTimestamp: targetTime,
      closestTimestamp: closestPrice[0],
      timeDiff: minDiff,
      price: closestPrice[1]
    });
    
    return NextResponse.json({
      price: closestPrice[1],
      timestamp: Math.floor(closestPrice[0] / 1000),
      source: "coingecko"
    });
    
  } catch (error) {
    console.error("Error fetching from CoinGecko:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch price" },
      { status: 500 }
    );
  }
}



