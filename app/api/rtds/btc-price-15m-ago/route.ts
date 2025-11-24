import { NextResponse } from 'next/server';
import { getBTCPrice15MinutesAgo } from '@/lib/db/queries';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Get BTC price from 15 minutes ago
 */
export async function GET() {
  try {
    const price = await getBTCPrice15MinutesAgo();
    
    if (!price) {
      return NextResponse.json(
        { error: 'No price data available from 15 minutes ago' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      price: parseFloat(price.price.toString()),
      timestamp: price.timestamp,
      source: price.source
    });
  } catch (error) {
    console.error('Error fetching BTC price from 15m ago:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BTC price' },
      { status: 500 }
    );
  }
}


