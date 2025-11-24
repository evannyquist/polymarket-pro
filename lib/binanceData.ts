"use client";

export type BitcoinPriceData = {
  currentPrice: number; // Current BTC/USD price (from Polymarket RTDS - Chainlink Data Streams)
  targetPrice: number; // Historical BTC/USD price at event start (Binance 15m candle open price - proxy for Chainlink)
  candleOpenTime: number; // Timestamp when the 15m window started (milliseconds)
  candleCloseTime: number; // Timestamp when the 15m window closes (milliseconds)
};

/**
 * Check if a date is in Daylight Saving Time (EDT) or Standard Time (EST)
 * DST in US: Second Sunday of March to First Sunday of November
 */
function isDST(date: Date): boolean {
  const year = date.getFullYear();
  
  // Second Sunday of March at 2:00 AM
  const marchSecondSunday = new Date(year, 2, 1);
  marchSecondSunday.setDate(1 + ((7 - marchSecondSunday.getDay()) % 7) + 7);
  marchSecondSunday.setHours(2, 0, 0, 0);
  
  // First Sunday of November at 2:00 AM
  const novemberFirstSunday = new Date(year, 10, 1);
  novemberFirstSunday.setDate(1 + ((7 - novemberFirstSunday.getDay()) % 7));
  novemberFirstSunday.setHours(2, 0, 0, 0);
  
  return date >= marchSecondSunday && date < novemberFirstSunday;
}

/**
 * Extract Unix timestamp from URL slug
 * Handles multiple slug formats:
 * - 15m: btc-updown-15m-{unix_timestamp}
 * - 1h: bitcoin-up-or-down-november-13-9pm-et
 * - 1d: bitcoin-up-or-down-on-november-14
 */
export function extractUnixTimestampFromSlug(slug: string): number | null {
  try {
    console.log("Extracting Unix timestamp from slug:", slug);
    
    // Check for 15m format: btc-updown-15m-{unix_timestamp}
    const timestampMatch = slug.match(/\b(\d{10}|\d{13})\b/);
    if (timestampMatch) {
      let timestamp = parseInt(timestampMatch[1], 10);
      
      if (timestamp > 1000000000000) {
        timestamp = Math.floor(timestamp / 1000);
      }
      
      console.log("Using Unix timestamp (seconds):", {
        timestamp,
        date: new Date(timestamp * 1000).toISOString()
      });
      
      return timestamp;
    }
    
    // Check for 1h format: bitcoin-up-or-down-november-13-9pm-et
    const hourMatch = slug.match(/bitcoin-up-or-down-(\w+)-(\d+)-(\d+)(am|pm)-et/);
    if (hourMatch) {
      const [, monthName, day, hour, ampm] = hourMatch;
      
      const months: { [key: string]: number } = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
      };
      
      const month = months[monthName.toLowerCase()];
      let hourNum = parseInt(hour, 10);
      
      // Convert to 24-hour format
      if (ampm === "pm" && hourNum !== 12) hourNum += 12;
      if (ampm === "am" && hourNum === 12) hourNum = 0;
      
      // Create date in ET
      const now = new Date();
      const year = now.getFullYear();
      const etDate = new Date(year, month, parseInt(day), hourNum, 0, 0, 0);
      
      // Convert ET to UTC
      const isDaylightSaving = isDST(etDate);
      const offsetHours = isDaylightSaving ? 4 : 5; // EDT is UTC-4, EST is UTC-5
      const utcDate = new Date(etDate.getTime() + offsetHours * 60 * 60 * 1000);
      
      const timestamp = Math.floor(utcDate.getTime() / 1000);
      
      console.log("Parsed 1h slug:", {
        month: monthName,
        day,
        hour: hourNum,
        ampm,
        etDate: etDate.toISOString(),
        utcDate: utcDate.toISOString(),
        timestamp
      });
      
      return timestamp;
    }
    
    // Check for 1d format: bitcoin-up-or-down-on-november-14
    const dayMatch = slug.match(/bitcoin-up-or-down-on-(\w+)-(\d+)/);
    if (dayMatch) {
      const [, monthName, day] = dayMatch;
      
      const months: { [key: string]: number } = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
      };
      
      const month = months[monthName.toLowerCase()];
      
      // Create date at start of day in ET (midnight)
      const now = new Date();
      const year = now.getFullYear();
      const etDate = new Date(year, month, parseInt(day), 0, 0, 0, 0);
      
      // Convert ET to UTC
      const isDaylightSaving = isDST(etDate);
      const offsetHours = isDaylightSaving ? 4 : 5;
      const utcDate = new Date(etDate.getTime() + offsetHours * 60 * 60 * 1000);
      
      const timestamp = Math.floor(utcDate.getTime() / 1000);
      
      console.log("Parsed 1d slug:", {
        month: monthName,
        day,
        etDate: etDate.toISOString(),
        utcDate: utcDate.toISOString(),
        timestamp
      });
      
      return timestamp;
    }
    
    console.warn("No valid timestamp pattern found in slug:", slug);
    return null;
  } catch (error) {
    console.error("Error extracting Unix timestamp from slug:", error);
    return null;
  }
}

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
 * Fetch Bitcoin target price at a specific Unix timestamp (in seconds)
 * Uses Binance candles as a proxy for Chainlink Data Streams
 * 
 * Note: Polymarket uses Chainlink Data Streams (https://data.chain.link/streams/btc-usd) which is a
 * premium product with sub-second price updates. We don't have access to historical Data Streams data,
 * so we use Binance candles which track Chainlink prices very closely (typically within 0.1-0.3%).
 * 
 * Current price comes from Polymarket RTDS WebSocket (useChainlinkBTCPrice hook) which pipes Chainlink Data Streams.
 * 
 * @param unixTimestampSeconds - Unix timestamp in seconds
 * @param interval - Binance interval (15m, 1h, 1d)
 */
export async function fetchBitcoinPriceAtTimestamp(
  unixTimestampSeconds: number,
  interval: string = "15m"
): Promise<BitcoinPriceData> {
  try {
    console.log("Fetching Bitcoin target price at timestamp:", unixTimestampSeconds);
    
    // Convert Unix timestamp (seconds) to milliseconds for Binance API
    const timestampMs = unixTimestampSeconds * 1000;
    
    // Determine period length based on interval
    let periodLengthMs: number;
    switch (interval) {
      case "15m":
        periodLengthMs = 15 * 60 * 1000;
        break;
      case "1h":
        periodLengthMs = 60 * 60 * 1000;
        break;
      case "1d":
        periodLengthMs = 24 * 60 * 60 * 1000;
        break;
      default:
        throw new Error(`Unknown interval: ${interval}`);
    }
    
    // Align to period boundary
    const candleStartTime = Math.floor(timestampMs / periodLengthMs) * periodLengthMs;
    
    console.log(`Fetching Binance ${interval} candle:`, {
      unixTimestampSeconds,
      timestampMs,
      candleStartTime,
      candleStartTimeSeconds: Math.floor(candleStartTime / 1000),
      candleStartTimeDate: new Date(candleStartTime).toISOString(),
      interval
    });
    
    // Fetch candle data - use Binance.US for 1h, Binance.com for others
    let targetPrice: number;
    let candleOpenTime: number;
    let candleCloseTime: number;
    
    // For 1h interval, use Binance.US (no US restrictions)
    // For other intervals (15m, 1d), try Binance.com with CoinGecko fallback
    const useBinanceUS = interval === "1h";
    
    if (useBinanceUS) {
      // Use Binance.US for 1-hour candles
      const oneHour = 60 * 60 * 1000;
      const startTime = candleStartTime - oneHour;
      const endTime = candleStartTime + oneHour;
      
      const binanceUSResponse = await fetch(
        `/api/binance-us/klines?symbol=BTCUSDT&interval=1h&startTime=${startTime}&endTime=${endTime}&limit=3`
      );
      
      if (!binanceUSResponse.ok) {
        throw new Error(`Failed to fetch from Binance.US: ${binanceUSResponse.statusText}`);
      }
      
      const klines = await binanceUSResponse.json();
      
      if (!klines || !Array.isArray(klines) || klines.length === 0) {
        throw new Error("No klines returned from Binance.US");
      }
      
      // Find the candle that contains our target time
      let targetCandle = null;
      for (const k of klines) {
        const openTime = k[0] as number;
        const closeTime = k[6] as number;
        
        if (openTime <= candleStartTime && candleStartTime < closeTime) {
          targetCandle = k;
          break;
        }
      }
      
      // Fallback: use closest candle
      if (!targetCandle && klines.length > 0) {
        targetCandle = klines.reduce((best, k) => {
          const mid = (k[0] + k[6]) / 2;
          const bestMid = (best[0] + best[6]) / 2;
          return Math.abs(mid - candleStartTime) < Math.abs(bestMid - candleStartTime) ? k : best;
        }, klines[0]);
      }
      
      if (!targetCandle) {
        throw new Error("Could not find matching candle from Binance.US");
      }
      
      targetPrice = parseFloat(targetCandle[1]); // Open price
      candleOpenTime = targetCandle[0];
      candleCloseTime = targetCandle[6];
      
      console.log("Fetched target price from Binance.US (1h candle):", {
        targetPrice,
        candleOpenTime,
        candleCloseTime,
        candleOpenTimeDate: new Date(candleOpenTime).toISOString(),
        candleCloseTimeDate: new Date(candleCloseTime).toISOString()
      });
    } else {
      // For 15m and 1d, try Binance.com with CoinGecko fallback
      try {
        const candleResponse = await fetch(
          `/api/binance/klines?symbol=BTCUSDT&interval=${interval}&startTime=${candleStartTime}&limit=1`
        );

        const candleData = await candleResponse.json();

        // Check if we got valid candle data from Binance
        if (candleResponse.ok && candleData && Array.isArray(candleData) && candleData.length > 0) {
          const candle = candleData[0];
          targetPrice = parseFloat(candle[1]); // Open price
          candleOpenTime = candle[0];
          candleCloseTime = candle[6];
          
          console.log("Fetched target price from Binance.com:", {
            targetPrice,
            candleOpenTime,
            candleCloseTime,
            candleOpenTimeDate: new Date(candleOpenTime).toISOString(),
            candleCloseTimeDate: new Date(candleCloseTime).toISOString()
          });
        } else {
          throw new Error("Binance.com data unavailable, falling back to CoinGecko");
        }
      } catch (binanceError) {
        // Fall back to CoinGecko for historical price
        console.warn("Binance.com failed, using CoinGecko:", binanceError);
        
        const coinGeckoResponse = await fetch(
          `/api/coingecko/historical?timestamp=${unixTimestampSeconds}`
        );
        
        if (!coinGeckoResponse.ok) {
          throw new Error(`Failed to fetch price from CoinGecko: ${coinGeckoResponse.statusText}`);
        }
        
        const coinGeckoData = await coinGeckoResponse.json();
        targetPrice = coinGeckoData.price;
        candleOpenTime = candleStartTime;
        candleCloseTime = candleStartTime + periodLengthMs;
        
        console.log("Fetched target price from CoinGecko (Binance alternative):", {
          targetPrice,
          candleOpenTime,
          candleCloseTime,
          candleOpenTimeDate: new Date(candleOpenTime).toISOString(),
          candleCloseTimeDate: new Date(candleCloseTime).toISOString()
        });
      }
    }

    // Current price will be updated via RTDS WebSocket, so set to 0 for now
    // It will be updated by the useChainlinkBTCPrice hook
    const currentPrice = 0;

    return {
      currentPrice, // Will be updated by RTDS WebSocket hook (Chainlink BTC/USD from Data Streams)
      targetPrice,  // Historical price from Binance 15m candle (close proxy to Chainlink)
      candleOpenTime,
      candleCloseTime,
    };
  } catch (error) {
    console.error("Error fetching Bitcoin price data:", error);
    throw error;
  }
}

/**
 * Fetch Bitcoin price data for a specific event start time
 * Gets the current price and the open price of the 1H candle
 * Note: eventStartTime is in Eastern Time (ET), needs to be converted to UTC for Binance
 * @deprecated Use fetchBitcoinPriceAtTimestamp instead
 */
export async function fetchBitcoinPriceData(eventStartTime: string): Promise<BitcoinPriceData> {
  try {
    // Parse the event start time - it's in Eastern Time (ET)
    // We need to convert ET to UTC for Binance API calls
    // ET is UTC-5 (EST) or UTC-4 (EDT) depending on daylight saving time
    
    let eventStartDate: Date;
    
    // Check if the string already has timezone info
    if (eventStartTime.includes('Z') || (eventStartTime.includes('+') || eventStartTime.includes('-')) && eventStartTime.match(/[+-]\d{2}:?\d{2}$/)) {
      // Already has timezone, parse as-is
      eventStartDate = new Date(eventStartTime);
    } else {
      // No timezone info - treat it as ET and convert to UTC
      // Parse the ISO string manually to extract components
      // Format is typically: YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm:ss.sss
      const match = eventStartTime.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/);
      
      if (!match) {
        throw new Error(`Invalid date format: ${eventStartTime}`);
      }
      
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // Month is 0-indexed
      const day = parseInt(match[3], 10);
      const hours = parseInt(match[4], 10);
      const minutes = parseInt(match[5], 10);
      const seconds = parseInt(match[6], 10);
      
      // Determine if DST applies for this date in ET
      // DST in US: Second Sunday in March to First Sunday in November
      const isDSTDate = (year: number, month: number, day: number): boolean => {
        if (month < 2 || month > 10) return false; // Dec, Jan, Feb are EST
        if (month > 2 && month < 10) return true; // Apr-Oct are EDT
        
        // March: check if after 2nd Sunday
        if (month === 2) {
          const firstDay = new Date(year, 2, 1);
          const firstSunday = 7 - firstDay.getDay();
          const secondSunday = firstSunday + 7;
          return day >= secondSunday;
        }
        
        // November: check if before 1st Sunday
        if (month === 10) {
          const firstDay = new Date(year, 10, 1);
          const firstSunday = 7 - firstDay.getDay();
          return day < firstSunday;
        }
        
        return false;
      };
      
      const isDST = isDSTDate(year, month, day);
      const etOffsetHours = isDST ? 4 : 5; // EDT is UTC-4, EST is UTC-5 (hours behind UTC)
      
      // Create date string with ET timezone offset
      // Format: YYYY-MM-DDTHH:mm:ss-05:00 (EST) or -04:00 (EDT)
      const etDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}-${String(etOffsetHours).padStart(2, '0')}:00`;
      eventStartDate = new Date(etDateString);
      
      // Verify the date is valid
      if (isNaN(eventStartDate.getTime())) {
        throw new Error(`Failed to parse ET date: ${eventStartTime} as ${etDateString}`);
      }
    }
    
    const eventStartTimestamp = eventStartDate.getTime();
    
    // Align to hour boundary for 1H candles (Binance candles start at exact hours in UTC)
    // Round down to the nearest hour in UTC
    const hourBoundaryTimestamp = Math.floor(eventStartTimestamp / (60 * 60 * 1000)) * (60 * 60 * 1000);
    
    console.log("Event start time (ET):", eventStartTime);
    console.log("Event start timestamp (UTC):", eventStartTimestamp);
    console.log("Hour boundary timestamp (UTC):", hourBoundaryTimestamp);
    
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

