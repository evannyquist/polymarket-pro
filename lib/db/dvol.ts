/**
 * DVOL (Deribit Volatility) Data Fetcher
 * Fetches 30-day implied volatility for BTC from Glassnode API
 */

type GlassnodeDvolPoint = {
  t: number; // unix timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close (DVOL as percentage)
};

/**
 * Fetches the latest DVOL (Deribit 30-day implied volatility) for Bitcoin
 * @returns Annual volatility as a decimal (e.g., 0.72 for 72%)
 * @throws Error if API key is missing, API call fails, or data is invalid
 */
export async function fetchDvolAnnualVol(): Promise<number> {
  // Read API key from environment
  const apiKey = process.env.GLASSNODE_API_KEY;
  
  if (!apiKey) {
    throw new Error('GLASSNODE_API_KEY environment variable is not set');
  }

  // Construct API endpoint
  const endpoint = `https://api.glassnode.com/v1/metrics/derivatives/dvol_ohlc?asset=BTC&a=BTC&api_key=${apiKey}`;

  try {
    // Fetch DVOL data from Glassnode
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 5 minutes to avoid excessive API calls
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(
        `Glassnode API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data: GlassnodeDvolPoint[] = await response.json();

    // Validate response
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid response: Expected non-empty array of DVOL data points');
    }

    // Get the last (most recent) data point
    const latestPoint = data[data.length - 1];

    if (!latestPoint || typeof latestPoint.c !== 'number') {
      throw new Error('Invalid data point: Missing or invalid close value');
    }

    // Convert from percentage to decimal
    // DVOL is returned as percentage (e.g., 72 for 72%)
    const volDecimal = latestPoint.c / 100;

    // Sanity check: volatility should be positive and reasonable (0.1% to 500%)
    if (volDecimal <= 0 || volDecimal > 5) {
      throw new Error(
        `Unreasonable volatility value: ${volDecimal} (${latestPoint.c}%)`
      );
    }

    return volDecimal;
  } catch (error) {
    // Re-throw with context
    if (error instanceof Error) {
      throw new Error(`DVOL fetch failed: ${error.message}`);
    }
    throw new Error('DVOL fetch failed: Unknown error');
  }
}


