import { NextRequest, NextResponse } from 'next/server';
import { getOpenOrders } from '@/lib/polymarket/clob-client';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Get user's open orders
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Missing address parameter' },
        { status: 400 }
      );
    }

    const orders = await getOpenOrders(address);

    return NextResponse.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error fetching open orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch open orders' },
      { status: 500 }
    );
  }
}


