import { NextResponse } from "next/server";

// Server-side API route to fetch CLOB markets by condition IDs
// This gets token IDs from condition IDs
export async function POST(request: Request) {
  try {
    const { conditionIds } = await request.json();
    
    if (!Array.isArray(conditionIds) || conditionIds.length === 0) {
      return NextResponse.json(
        { error: "conditionIds array required" },
        { status: 400 }
      );
    }
    
    // Fetch markets from CLOB API
    // CLOB API: GET /markets?next_cursor=
    // We'll fetch multiple pages if needed to find all condition IDs
    const endpoint = "https://clob.polymarket.com/markets?next_cursor=";
    const allMarkets: any[] = [];
    let nextCursor = "";
    let foundCount = 0;
    const maxPages = 10; // Limit to prevent infinite loops
    
    // Fetch pages until we find all condition IDs or hit max pages
    for (let page = 0; page < maxPages && foundCount < conditionIds.length; page++) {
      const url = endpoint + (nextCursor || "");
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
        next: { revalidate: 60 },
      });

      if (!response.ok) {
        break;
      }

      const data = await response.json();
      const markets = data.data || [];
      allMarkets.push(...markets);
      
      // Check if we found any of our condition IDs
      const foundIds = markets
        .map((m: any) => m.condition_id)
        .filter((cid: string) => conditionIds.includes(cid));
      foundCount += foundIds.length;
      
      // Get next cursor for pagination
      nextCursor = data.next_cursor || "";
      if (!nextCursor || nextCursor === "LTE=") {
        break; // End of data
      }
    }
    
    // Filter markets by condition IDs
    const filteredMarkets = allMarkets.filter((m: any) => {
      const cid = m.condition_id || "";
      return conditionIds.includes(cid);
    });
    
    console.log(`Found ${filteredMarkets.length} markets for ${conditionIds.length} condition IDs`);
    
    return NextResponse.json({ data: filteredMarkets });
  } catch (error) {
    console.error("Error in CLOB markets API route:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Internal server error",
        data: []
      },
      { status: 500 }
    );
  }
}

