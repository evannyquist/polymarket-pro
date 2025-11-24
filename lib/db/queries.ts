import { sql } from '@vercel/postgres';

export interface BTCPrice {
  id: number;
  timestamp: Date;
  price: number;
  source: string;
  created_at: Date;
}

export interface MarketPrice {
  id: number;
  timestamp: Date;
  token_id: string;
  price: number;
  market_slug: string | null;
  created_at: Date;
}

/**
 * Insert a new BTC price record
 */
export async function insertBTCPrice(price: number, source: string) {
  const timestamp = new Date();
  await sql`
    INSERT INTO btc_prices (timestamp, price, source)
    VALUES (${timestamp}, ${price}, ${source})
  `;
}

/**
 * Insert a new market price record
 */
export async function insertMarketPrice(
  tokenId: string,
  price: number,
  marketSlug?: string
) {
  const timestamp = new Date();
  await sql`
    INSERT INTO market_prices (timestamp, token_id, price, market_slug)
    VALUES (${timestamp}, ${tokenId}, ${price}, ${marketSlug || null})
  `;
}

/**
 * Get BTC price from exactly 15 minutes ago (or closest available)
 */
export async function getBTCPrice15MinutesAgo(): Promise<BTCPrice | null> {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  
  // Get the closest price to 15 minutes ago (within 1 minute window)
  const result = await sql<BTCPrice>`
    SELECT *
    FROM btc_prices
    WHERE timestamp >= ${new Date(fifteenMinutesAgo.getTime() - 30 * 1000)}
      AND timestamp <= ${new Date(fifteenMinutesAgo.getTime() + 30 * 1000)}
    ORDER BY ABS(EXTRACT(EPOCH FROM (timestamp - ${fifteenMinutesAgo})))
    LIMIT 1
  `;
  
  return result.rows[0] || null;
}

/**
 * Get all BTC prices from the last 24 hours
 */
export async function getBTCPrices24Hours(): Promise<BTCPrice[]> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const result = await sql<BTCPrice>`
    SELECT *
    FROM btc_prices
    WHERE timestamp >= ${twentyFourHoursAgo}
    ORDER BY timestamp ASC
  `;
  
  return result.rows;
}

/**
 * Calculate 24-hour Bitcoin volatility (standard deviation of returns)
 */
export async function calculateBTC24HourVolatility(): Promise<number | null> {
  const prices = await getBTCPrices24Hours();
  
  if (prices.length < 2) {
    return null;
  }
  
  // Calculate returns (percentage changes)
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prevPrice = parseFloat(prices[i - 1].price.toString());
    const currentPrice = parseFloat(prices[i].price.toString());
    const returnValue = (currentPrice - prevPrice) / prevPrice;
    returns.push(returnValue);
  }
  
  // Calculate mean return
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  
  // Calculate variance
  const variance = returns.reduce((sum, r) => {
    const diff = r - meanReturn;
    return sum + diff * diff;
  }, 0) / returns.length;
  
  // Standard deviation (volatility)
  const volatility = Math.sqrt(variance);
  
  // Annualize the volatility (assuming we have minute-level data)
  // Annual volatility = period volatility * sqrt(periods per year)
  // For minute data: sqrt(525600) ≈ 725
  // For simplicity, return the raw volatility (can be scaled later)
  return volatility;
}

/**
 * Get market price history for a specific token
 */
export async function getMarketPriceHistory(
  tokenId: string,
  hoursBack: number = 24
): Promise<MarketPrice[]> {
  const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  
  const result = await sql<MarketPrice>`
    SELECT *
    FROM market_prices
    WHERE token_id = ${tokenId}
      AND timestamp >= ${startTime}
    ORDER BY timestamp ASC
  `;
  
  return result.rows;
}

/**
 * Delete records older than 24 hours (cleanup function)
 */
export async function cleanupOldRecords() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  await sql`
    DELETE FROM btc_prices
    WHERE created_at < ${twentyFourHoursAgo}
  `;
  
  await sql`
    DELETE FROM market_prices
    WHERE created_at < ${twentyFourHoursAgo}
  `;
}

/**
 * Initialize database tables (run this once on deployment)
 */
export async function initializeDatabase() {
  // Note: This should be run via a migration or setup script
  // For Vercel Postgres, you can run the schema.sql file manually
  // or use the Vercel dashboard
  console.log('Database initialization should be done via Vercel dashboard or migration tool');
}


