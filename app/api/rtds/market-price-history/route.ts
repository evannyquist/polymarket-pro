import { NextRequest, NextResponse } from 'next/server';
import { getMarketPriceHistory } from '@/lib/db/queries';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Get market price history for charting
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');
    const hoursBack = parseInt(searchParams.get('hoursBack') || '24');

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Missing tokenId parameter' },
        { status: 400 }
      );
    }

    const history = await getMarketPriceHistory(tokenId, hoursBack);

    return NextResponse.json({
      success: true,
      history: history.map(p => ({
        t: Math.floor(new Date(p.timestamp).getTime() / 1000),
        v: parseFloat(p.price.toString())
      }))
    });
  } catch (error) {
    console.error('Error fetching market price history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    );
  }
}


