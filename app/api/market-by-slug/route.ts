import { NextResponse } from "next/server";

// Server-side API route to fetch market by slug (avoids CORS issues)
// Reference: 
// - https://docs.polymarket.com/api-reference/events/list-events
// - https://docs.polymarket.com/api-reference/markets/list-markets
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug parameter is required" },
        { status: 400 }
      );
    }

    // Prioritize events endpoint per documentation
    // Reference: https://docs.polymarket.com/api-reference/events/get-event-by-slug
    // GET /events/slug/{slug}
    const eventsEndpoint = `https://gamma-api.polymarket.com/events/slug/${encodeURIComponent(slug)}`;
    
    console.log("Fetching event from:", eventsEndpoint);
    const eventsResponse = await fetch(eventsEndpoint, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Polymarket-Pro/1.0",
      },
      next: { revalidate: 60 },
    });

    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json();
      console.log("Events API response status:", eventsResponse.status);
      console.log("Events API response has markets:", eventsData.markets ? `Yes, ${Array.isArray(eventsData.markets) ? eventsData.markets.length : 'not array'}` : "No");
      
      // Comprehensive logging for bitcoin up/down market analysis
      console.log("\n=== FULL API RESPONSE STRUCTURE ===");
      console.log("Full response JSON:", JSON.stringify(eventsData, null, 2));
      console.log("\n=== TOP-LEVEL KEYS ===");
      console.log("Top-level keys:", Object.keys(eventsData));
      
      // Log each top-level key with its type and sample value
      for (const key of Object.keys(eventsData)) {
        const value = eventsData[key];
        console.log(`\n[${key}]:`, {
          type: typeof value,
          isArray: Array.isArray(value),
          isObject: typeof value === 'object' && value !== null && !Array.isArray(value),
          value: typeof value === 'object' ? (Array.isArray(value) ? `Array(${value.length})` : 'Object') : value,
          keys: typeof value === 'object' && value !== null && !Array.isArray(value) ? Object.keys(value) : undefined
        });
      }
      
      // If there are markets, log each market's structure
      if (eventsData.markets && Array.isArray(eventsData.markets)) {
        console.log("\n=== MARKETS ARRAY ANALYSIS ===");
        console.log(`Found ${eventsData.markets.length} market(s)`);
        eventsData.markets.forEach((market: any, index: number) => {
          console.log(`\n--- Market ${index + 1} ---`);
          console.log("Market keys:", Object.keys(market));
          console.log("Full market object:", JSON.stringify(market, null, 2));
          
          // Look for bitcoin-related fields
          const bitcoinKeywords = ['bitcoin', 'btc', 'price', 'current', 'target', 'open', 'close', 'resolution', 'candle'];
          const foundKeywords: string[] = [];
          const searchInObject = (obj: any, path: string = '') => {
            if (typeof obj !== 'object' || obj === null) return;
            for (const key in obj) {
              const fullPath = path ? `${path}.${key}` : key;
              const lowerKey = key.toLowerCase();
              const lowerValue = String(obj[key]).toLowerCase();
              
              if (bitcoinKeywords.some(kw => lowerKey.includes(kw) || lowerValue.includes(kw))) {
                foundKeywords.push(`${fullPath}: ${JSON.stringify(obj[key])}`);
              }
              
              if (typeof obj[key] === 'object' && obj[key] !== null) {
                searchInObject(obj[key], fullPath);
              }
            }
          };
          searchInObject(market);
          if (foundKeywords.length > 0) {
            console.log("🔍 Bitcoin-related fields found:", foundKeywords);
          }
        });
      }
      
      // Check for bitcoin-related fields in the event data itself
      const eventBitcoinKeywords: string[] = [];
      const searchEventData = (obj: any, path: string = '') => {
        if (typeof obj !== 'object' || obj === null) return;
        for (const key in obj) {
          const fullPath = path ? `${path}.${key}` : key;
          const lowerKey = key.toLowerCase();
          const lowerValue = String(obj[key]).toLowerCase();
          
          if (['bitcoin', 'btc', 'price', 'current', 'target', 'open', 'close', 'resolution', 'candle', 'source'].some(kw => 
            lowerKey.includes(kw) || lowerValue.includes(kw))) {
            eventBitcoinKeywords.push(`${fullPath}: ${JSON.stringify(obj[key])}`);
          }
          
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            searchEventData(obj[key], fullPath);
          }
        }
      };
      searchEventData(eventsData);
      if (eventBitcoinKeywords.length > 0) {
        console.log("\n🔍 Bitcoin-related fields in event data:", eventBitcoinKeywords);
      }
      
      console.log("\n=== END API RESPONSE ANALYSIS ===\n");
      
      return NextResponse.json(eventsData);
    }

    // Fallback to markets endpoint if events endpoint fails
    // GET /markets?slug=<slug>
    const marketsEndpoint = `https://gamma-api.polymarket.com/markets?slug=${encodeURIComponent(slug)}`;
    
    console.log("Events endpoint failed, trying markets endpoint:", marketsEndpoint);
    const marketsResponse = await fetch(marketsEndpoint, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Polymarket-Pro/1.0",
      },
      next: { revalidate: 60 },
    });

    if (marketsResponse.ok) {
      const marketsData = await marketsResponse.json();
      
      // Comprehensive logging for markets endpoint
      console.log("\n=== MARKETS API RESPONSE STRUCTURE ===");
      console.log("Is array:", Array.isArray(marketsData));
      console.log("Full response JSON:", JSON.stringify(marketsData, null, 2));
      
      if (Array.isArray(marketsData) && marketsData.length > 0) {
        console.log(`\nFound ${marketsData.length} market(s) in array`);
        marketsData.forEach((market: any, index: number) => {
          console.log(`\n--- Market ${index + 1} in array ---`);
          console.log("Market keys:", Object.keys(market));
          console.log("Full market object:", JSON.stringify(market, null, 2));
        });
        
        // Look for bitcoin-related fields in the first market
        const firstMarket = marketsData[0];
        const bitcoinKeywords = ['bitcoin', 'btc', 'price', 'current', 'target', 'open', 'close', 'resolution', 'candle'];
        const foundKeywords: string[] = [];
        const searchInObject = (obj: any, path: string = '') => {
          if (typeof obj !== 'object' || obj === null) return;
          for (const key in obj) {
            const fullPath = path ? `${path}.${key}` : key;
            const lowerKey = key.toLowerCase();
            const lowerValue = String(obj[key]).toLowerCase();
            
            if (bitcoinKeywords.some(kw => lowerKey.includes(kw) || lowerValue.includes(kw))) {
              foundKeywords.push(`${fullPath}: ${JSON.stringify(obj[key])}`);
            }
            
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              searchInObject(obj[key], fullPath);
            }
          }
        };
        searchInObject(firstMarket);
        if (foundKeywords.length > 0) {
          console.log("\n🔍 Bitcoin-related fields found:", foundKeywords);
        }
      } else {
        console.log("\n--- Single market object ---");
        console.log("Market keys:", Object.keys(marketsData));
        console.log("Full market object:", JSON.stringify(marketsData, null, 2));
      }
      
      console.log("\n=== END MARKETS API RESPONSE ANALYSIS ===\n");
      
      // Markets endpoint returns an array
      if (Array.isArray(marketsData) && marketsData.length > 0) {
        return NextResponse.json(marketsData[0]); // Return first market
      }
      // If it's not an array, return as-is
      return NextResponse.json(marketsData);
    }

    throw new Error(`Both events and markets endpoints failed. Events: ${eventsResponse.status}, Markets: ${marketsResponse.status}`);
  } catch (error) {
    console.error("Error in market-by-slug API route:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  }
}

