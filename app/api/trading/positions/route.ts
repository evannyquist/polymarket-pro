import { NextRequest, NextResponse } from 'next/server';
import { getPositions } from '@/lib/polymarket/clob-client';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Get user's positions
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

    const positions = await getPositions(address);

    return NextResponse.json({
      success: true,
      positions
    });
  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    );
  }
}


