"use client";

export type BitcoinPriceData = {
  currentPrice: number; // Current BTC/USDT price
  targetPrice: number; // Open price of the 1H candle (price to beat)
  candleOpenTime: number; // Timestamp when the candle started (milliseconds)
  candleCloseTime: number; // Timestamp when the candle closes (milliseconds)
};

/**
 * Fetch current Bitcoin price from Binance
 */
export async function fetchCurrentBitcoinPrice(): Promise<number> {
  try {
    const response = await fetch(`/api/binance/price?symbol=BTCUSDT`);
    if (!response.ok) {
      throw new Error(`Failed to fetch BTC price: ${response.statusText}`);
    }
    const data = await response.json();
    return parseFloat(data.price);
  } catch (error) {
    console.error("Error fetching current Bitcoin price:", error);
    throw error;
  }
}

/**
 * Fetch Bitcoin price data for a specific event start time
 * Gets the current price and the open price of the 1H candle
 */
export async function fetchBitcoinPriceData(eventStartTime: string): Promise<BitcoinPriceData> {
  try {
    // Convert ISO timestamp to milliseconds
    const eventStartDate = new Date(eventStartTime);
    const eventStartTimestamp = eventStartDate.getTime();
    
    // Align to hour boundary for 1H candles (Binance candles start at exact hours)
    // Round down to the nearest hour
    const hourBoundaryTimestamp = Math.floor(eventStartTimestamp / (60 * 60 * 1000)) * (60 * 60 * 1000);
    
    console.log("Event start time:", eventStartTime);
    console.log("Event start timestamp:", eventStartTimestamp);
    console.log("Hour boundary timestamp:", hourBoundaryTimestamp);
    
    // Fetch both current price and candle data
    const [currentPriceResponse, candleResponse] = await Promise.all([
      fetch(`/api/binance/price?symbol=BTCUSDT`),
      fetch(`/api/binance/klines?symbol=BTCUSDT&interval=1h&startTime=${hourBoundaryTimestamp}&limit=1`)
    ]);

    if (!currentPriceResponse.ok) {
      throw new Error(`Failed to fetch BTC price: ${currentPriceResponse.statusText}`);
    }
    if (!candleResponse.ok) {
      throw new Error(`Failed to fetch candle data: ${candleResponse.statusText}`);
    }

    const priceData = await currentPriceResponse.json();
    const candleData = await candleResponse.json();

    const currentPrice = parseFloat(priceData.price);

    // Kline response format: [Open time, Open, High, Low, Close, Volume, ...]
    // If we got candle data, use the open price from the candle
    // Otherwise, we'll need to fetch it differently
    let targetPrice: number;
    let candleOpenTime: number;
    let candleCloseTime: number;

    if (candleData && Array.isArray(candleData) && candleData.length > 0) {
      const candle = candleData[0];
      // Kline format: [Open time (0), Open (1), High (2), Low (3), Close (4), Volume (5), Close time (6), ...]
      targetPrice = parseFloat(candle[1]); // Open price (index 1)
      candleOpenTime = candle[0]; // Open time (index 0) - milliseconds
      candleCloseTime = candle[6]; // Close time (index 6) - milliseconds (more accurate than calculating)
    } else {
      // Fallback: if we can't get the exact candle, use current price as target
      // This shouldn't happen, but handle gracefully
      console.warn("Could not fetch candle data, using current price as target");
      targetPrice = currentPrice;
      candleOpenTime = eventStartTimestamp;
      candleCloseTime = eventStartTimestamp + (60 * 60 * 1000);
    }

    return {
      currentPrice,
      targetPrice,
      candleOpenTime,
      candleCloseTime,
    };
  } catch (error) {
    console.error("Error fetching Bitcoin price data:", error);
    throw error;
  }
}

