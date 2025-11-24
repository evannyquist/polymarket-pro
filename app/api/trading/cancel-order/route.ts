import { NextRequest, NextResponse } from 'next/server';
import { cancelOrder } from '@/lib/polymarket/clob-client';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Cancel an order
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId, signature } = await request.json();

    if (!orderId || !signature) {
      return NextResponse.json(
        { error: 'Missing orderId or signature' },
        { status: 400 }
      );
    }

    const success = await cancelOrder(orderId, signature);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Order cancelled successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to cancel order' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error canceling order:', error);
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}


