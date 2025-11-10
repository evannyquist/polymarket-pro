import { NextResponse } from "next/server";

// Server-side API route to fetch markets (avoids CORS issues)
// Reference: https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
export async function GET() {
  try {
    // Use Gamma API events endpoint to get active markets
    // This is the recommended approach per documentation
    // GET /events?order=id&ascending=false&closed=false&limit=5
    const endpoint = "https://gamma-api.polymarket.com/events?order=id&ascending=false&closed=false&limit=5";
    
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Polymarket-Pro/1.0",
      },
      // Add cache control
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });

    if (!response.ok) {
      throw new Error(`Gamma API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Gamma Events API Response:", data);
    
    // Gamma API returns events which contain markets
    // Return the full response
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in markets API route:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Internal server error",
        data: [],
        count: 0
      },
      { status: 500 }
    );
  }
}

