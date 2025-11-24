import { NextResponse } from "next/server";
import { fetchBinanceATMIV } from "@/lib/db/binance-atm-iv";

/**
 * GET /api/volatility/binance-atm-iv
 * Fetches at-the-money implied volatility from Binance Options
 * Returns volatility as a decimal (e.g., 0.60 for 60%)
 * 
 * No API key required - uses public Binance Options API
 */
export async function GET() {
  try {
    const volatility = await fetchBinanceATMIV();
    
    return NextResponse.json({ 
      success: true, 
      volatility,
      source: 'binance-atm-iv'
    });
  } catch (error) {
    console.error("Binance ATM IV fetch error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch Binance ATM IV" 
      }, 
      { status: 500 }
    );
  }
}


