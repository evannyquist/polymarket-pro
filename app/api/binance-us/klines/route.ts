import { NextRequest, NextResponse } from "next/server";

/**
 * Fetch kline (candlestick) data from Binance.US
 * This is used for 1-hour Bitcoin Up/Down markets
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol") || "BTCUSDT";
  const interval = searchParams.get("interval") || "1h";
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");
  const limit = searchParams.get("limit") || "3";

  if (!startTime) {
    return NextResponse.json(
      { error: "Missing required parameter: startTime" },
      { status: 400 }
    );
  }

  try {
    const url = new URL("https://api.binance.us/api/v3/klines");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("startTime", startTime);
    if (endTime) {
      url.searchParams.set("endTime", endTime);
    }
    url.searchParams.set("limit", limit);

    console.log("Fetching from Binance.US:", url.toString());

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 60 } // Cache for 1 minute
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Binance.US API error:", errorText);
      return NextResponse.json(
        { error: `Binance.US API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log("Binance.US klines response:", {
      symbol,
      interval,
      count: data.length,
      firstCandle: data[0] ? {
        openTime: new Date(data[0][0]).toISOString(),
        open: data[0][1],
        closeTime: new Date(data[0][6]).toISOString()
      } : null
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching from Binance.US:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch klines" },
      { status: 500 }
    );
  }
}



