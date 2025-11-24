import { NextResponse } from 'next/server';
import { calculateBTC24HourVolatility } from '@/lib/db/queries';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Calculate and return 24-hour Bitcoin volatility
 */
export async function GET() {
  try {
    const volatility = await calculateBTC24HourVolatility();
    
    if (volatility === null) {
      return NextResponse.json(
        { error: 'Insufficient data to calculate volatility' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      volatility,
      annualizedVolatility: volatility * Math.sqrt(525600) // Annualize assuming minute-level data
    });
  } catch (error) {
    console.error('Error calculating volatility:', error);
    return NextResponse.json(
      { error: 'Failed to calculate volatility' },
      { status: 500 }
    );
  }
}


