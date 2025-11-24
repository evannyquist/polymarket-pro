import { NextRequest, NextResponse } from 'next/server';
import { insertMarketPrice } from '@/lib/db/queries';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * API endpoint to collect and store market price data
 * This is called by a background job or cron
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenId, price, marketSlug } = body;

    if (!tokenId || price === undefined) {
      return NextResponse.json(
        { error: 'Missing tokenId or price' },
        { status: 400 }
      );
    }

    await insertMarketPrice(tokenId, parseFloat(price), marketSlug);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error collecting market price:', error);
    return NextResponse.json(
      { error: 'Failed to store market price' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for testing - returns latest stored market price
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');
    
    const { sql } = await import('@vercel/postgres');
    
    let result;
    if (tokenId) {
      result = await sql`
        SELECT * FROM market_prices
        WHERE token_id = ${tokenId}
        ORDER BY timestamp DESC
        LIMIT 10
      `;
    } else {
      result = await sql`
        SELECT * FROM market_prices
        ORDER BY timestamp DESC
        LIMIT 10
      `;
    }
    
    return NextResponse.json({ 
      success: true, 
      prices: result.rows 
    });
  } catch (error) {
    console.error('Error fetching market prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market prices' },
      { status: 500 }
    );
  }
}


