import { NextRequest, NextResponse } from 'next/server';
import { insertBTCPrice } from '@/lib/db/queries';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * API endpoint to collect and store BTC price data
 * This is called by a background job or cron
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { price, source } = body;

    if (!price || !source) {
      return NextResponse.json(
        { error: 'Missing price or source' },
        { status: 400 }
      );
    }

    await insertBTCPrice(parseFloat(price), source);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error collecting BTC price:', error);
    return NextResponse.json(
      { error: 'Failed to store BTC price' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for testing - returns latest stored price
 */
export async function GET() {
  try {
    const { sql } = await import('@vercel/postgres');
    const result = await sql`
      SELECT * FROM btc_prices
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    
    return NextResponse.json({ 
      success: true, 
      latestPrice: result.rows[0] || null 
    });
  } catch (error) {
    console.error('Error fetching latest BTC price:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest BTC price' },
      { status: 500 }
    );
  }
}


