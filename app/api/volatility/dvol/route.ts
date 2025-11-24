import { NextResponse } from "next/server";
import { fetchDvolAnnualVol } from "@/lib/db/dvol";

/**
 * GET /api/volatility/dvol
 * Fetches the latest DVOL (Deribit 30-day implied volatility) for Bitcoin
 * Returns volatility as a decimal (e.g., 0.72 for 72%)
 */
export async function GET() {
  try {
    const volatility = await fetchDvolAnnualVol();
    
    return NextResponse.json({ 
      success: true, 
      volatility,
      source: 'glassnode-dvol'
    });
  } catch (error) {
    console.error("DVOL fetch error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch DVOL" 
      }, 
      { status: 500 }
    );
  }
}


