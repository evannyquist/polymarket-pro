/**
 * Binance Options ATM Implied Volatility Fetcher
 * Fetches at-the-money (ATM) implied volatility from Binance Options
 * Best for short-term probability accuracy on 15-minute markets
 */

/**
 * Fetches the at-the-money implied volatility from Binance Options
 * 
 * Strategy:
 * 1. Get current BTC index price
 * 2. Find options chain for nearest expiry
 * 3. Get ATM options (strike closest to spot)
 * 4. Calculate implied volatility from mark price
 * 
 * @returns Annualized implied volatility as decimal (e.g., 0.60 for 60%)
 * @throws Error if API call fails or data is invalid
 */
export async function fetchBinanceATMIV(): Promise<number> {
  try {
    // Binance Options API endpoints
    const BASE_URL = 'https://eapi.binance.com/eapi/v1';
    
    // 1. Get current BTC index price
    const indexResponse = await fetch(`${BASE_URL}/index?underlying=BTCUSDT`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!indexResponse.ok) {
      throw new Error(
        `Binance index API failed: ${indexResponse.status} ${indexResponse.statusText}`
      );
    }

    const indexData = await indexResponse.json();
    const indexPrice = parseFloat(indexData.indexPrice);

    if (!indexPrice || isNaN(indexPrice)) {
      throw new Error('Invalid index price from Binance');
    }

    // 2. Get mark price for all BTC options
    const markPriceResponse = await fetch(`${BASE_URL}/mark?symbol=BTC`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 },
    });

    if (!markPriceResponse.ok) {
      throw new Error(
        `Binance mark price API failed: ${markPriceResponse.status} ${markPriceResponse.statusText}`
      );
    }

    const markPriceData = await markPriceResponse.json();

    if (!Array.isArray(markPriceData) || markPriceData.length === 0) {
      throw new Error('No options data available from Binance');
    }

    // 3. Find ATM options for nearest expiry
    // Filter for valid options with IV data
    const optionsWithIV = markPriceData.filter((opt: any) => {
      return opt.markIV && parseFloat(opt.markIV) > 0;
    });

    if (optionsWithIV.length === 0) {
      throw new Error('No options with valid IV data');
    }

    // Group by expiry date and find nearest
    const expiryGroups = new Map<string, any[]>();
    for (const opt of optionsWithIV) {
      const expiry = opt.symbol.match(/BTC-\d+-/)?.[0];
      if (expiry) {
        if (!expiryGroups.has(expiry)) {
          expiryGroups.set(expiry, []);
        }
        expiryGroups.get(expiry)!.push(opt);
      }
    }

    // Get nearest expiry
    const sortedExpiries = Array.from(expiryGroups.keys()).sort();
    if (sortedExpiries.length === 0) {
      throw new Error('No valid expiries found');
    }

    const nearestExpiry = sortedExpiries[0];
    const nearestOptions = expiryGroups.get(nearestExpiry)!;

    // 4. Find ATM options (strike closest to spot)
    // Look at both calls and puts
    let closestStrikeDiff = Infinity;
    let atmIV = 0;
    
    for (const opt of nearestOptions) {
      // Extract strike from symbol (e.g., "BTC-250124-90000-C" -> 90000)
      const strikeMatch = opt.symbol.match(/-(\d+)-[CP]$/);
      if (!strikeMatch) continue;
      
      const strike = parseFloat(strikeMatch[1]);
      const diff = Math.abs(strike - indexPrice);
      
      if (diff < closestStrikeDiff) {
        closestStrikeDiff = diff;
        atmIV = parseFloat(opt.markIV);
      }
    }

    if (atmIV <= 0) {
      throw new Error('Could not find valid ATM IV');
    }

    // Binance returns IV as decimal (e.g., 0.6 for 60%)
    // Sanity check: IV should be between 0.1 and 5.0 (10% to 500%)
    if (atmIV < 0.001 || atmIV > 5.0) {
      throw new Error(
        `Unreasonable ATM IV value: ${atmIV} (${(atmIV * 100).toFixed(1)}%)`
      );
    }

    return atmIV;
  } catch (error) {
    // Re-throw with context
    if (error instanceof Error) {
      throw new Error(`Binance ATM IV fetch failed: ${error.message}`);
    }
    throw new Error('Binance ATM IV fetch failed: Unknown error');
  }
}


