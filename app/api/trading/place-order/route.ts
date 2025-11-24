import { NextRequest, NextResponse } from 'next/server';
import { placeOrder, type SignedOrder } from '@/lib/polymarket/clob-client';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Place a trading order on Polymarket
 */
export async function POST(request: NextRequest) {
  try {
    const signedOrder: SignedOrder = await request.json();

    // Validate required fields
    if (!signedOrder.tokenID || !signedOrder.signature || !signedOrder.signer) {
      return NextResponse.json(
        { error: 'Missing required order fields' },
        { status: 400 }
      );
    }

    const result = await placeOrder(signedOrder);

    return NextResponse.json({
      success: true,
      order: result
    });
  } catch (error) {
    console.error('Error placing order:', error);
    return NextResponse.json(
      { 
        error: 'Failed to place order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


