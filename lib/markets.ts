"use client";

import { useEffect, useState } from "react";

// Polymarket Gamma API endpoint (official API for markets)
// Reference: https://docs.polymarket.com/quickstart/introduction/main
const POLYMARKET_GAMMA_API = "https://gamma-api.polymarket.com";

export type Market = {
  id: string; // condition ID
  tokenId: string; // token ID for YES outcome (for price data)
  question: string;
  slug: string;
  endDate?: string;
  active?: boolean;
  volume?: string;
  bestBid?: number; // Current best bid price
  bestAsk?: number; // Current best ask price
  lastTradePrice?: number; // Last trade price
};

export function useMarkets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        
        // Use Next.js API route to avoid CORS issues
        // The API route will proxy requests to Polymarket's API
        const response = await fetch("/api/markets", {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
        });

        console.log("Markets API Response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(`API returned ${response.status}: ${JSON.stringify(errorData)}`);
        }

        const responseData = await response.json();
        console.log("Full API Response:", JSON.stringify(responseData, null, 2).substring(0, 1000));
        
        // Gamma API events endpoint returns events, which contain markets
        // Events have a markets array with the actual market data
        // Reference: https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
        const events = Array.isArray(responseData) ? responseData : responseData.data || [];
        
        if (!Array.isArray(events) || events.length === 0) {
          throw new Error(`No events found. Response structure: ${JSON.stringify(responseData).substring(0, 200)}`);
        }
        
        console.log("First event example:", JSON.stringify(events[0], null, 2).substring(0, 500));
        
        // Extract markets from events
        // Each event can have multiple markets
        const allMarkets: any[] = [];
        for (const event of events) {
          if (event.markets && Array.isArray(event.markets)) {
            allMarkets.push(...event.markets);
          }
          // Also check if the event itself is a market (some APIs return markets directly)
          if (event.condition_id || event.conditionId) {
            allMarkets.push(event);
          }
        }
        
        // If no markets in events, try treating response as direct markets array
        const marketsData = allMarkets.length > 0 ? allMarkets : (Array.isArray(responseData) ? responseData : []);
        
        console.log("Extracted markets count:", marketsData.length);
        if (marketsData.length > 0) {
          console.log("First market example:", JSON.stringify(marketsData[0], null, 2).substring(0, 500));
        }
        
        if (marketsData.length === 0) {
          throw new Error(`No markets found in events. Response structure: ${JSON.stringify(responseData).substring(0, 200)}`);
        }
        
        // Format the markets data according to Gamma API structure
        // Gamma API returns markets with conditionId, but we need to get token IDs from CLOB API
        const allValidMarkets: Market[] = [];
        
        // First, collect all condition IDs
        const conditionIds: string[] = [];
        for (const m of marketsData) {
          const conditionId = m.condition_id || m.conditionId || "";
          if (conditionId) {
            conditionIds.push(conditionId);
          }
        }
        
        // Fetch token IDs from CLOB API using condition IDs
        // We'll fetch markets from CLOB API to get the token IDs
        try {
          const clobResponse = await fetch("/api/clob-markets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ conditionIds }),
          });
          
          if (clobResponse.ok) {
            const clobData = await clobResponse.json();
            const clobMarkets = clobData.data || [];
            
            // Create a map of conditionId -> tokenId from CLOB data
            const conditionToTokenMap = new Map<string, string>();
            for (const cm of clobMarkets) {
              const cid = cm.condition_id || "";
              console.log("CLOB Market:", {
                condition_id: cid,
                tokens: cm.tokens,
                token_structure: cm.tokens?.[0]
              });
              
              if (cm.tokens && Array.isArray(cm.tokens) && cm.tokens.length > 0) {
                // Get the first token (usually YES outcome for binary markets)
                const firstToken = cm.tokens[0];
                // Try multiple possible token ID fields
                const tid = firstToken?.token_id || firstToken?.tokenId || firstToken?.id || firstToken?.outcomeToken || "";
                
                // Token IDs should be numeric strings (not hex addresses)
                // If it's a hex address, we might need to convert it or use it differently
                console.log(`Token ID candidate for condition ${cid}:`, {
                  raw: tid,
                  type: typeof tid,
                  length: tid.length,
                  isHex: tid.startsWith("0x"),
                  tokenObject: firstToken
                });
                
                if (cid && tid) {
                  conditionToTokenMap.set(cid, tid);
                  console.log(`✓ Mapped condition ${cid} -> token ${tid}`);
                } else {
                  console.warn(`✗ Could not extract token ID for condition ${cid}`, firstToken);
                }
              } else {
                console.warn(`✗ No tokens found for condition ${cid}`);
              }
            }
            
            console.log(`Token mapping complete. Found ${conditionToTokenMap.size} token IDs for ${conditionIds.length} condition IDs`);
            
            // Now match Gamma markets with CLOB token IDs
            for (const m of marketsData) {
              const conditionId = m.condition_id || m.conditionId || "";
              const tokenId = conditionToTokenMap.get(conditionId) || "";
              
              if (conditionId && tokenId) {
                allValidMarkets.push({
                  id: conditionId,
                  tokenId: tokenId,
                  question: m.question || m.title || "Unknown Market",
                  slug: m.slug || m.market_slug || "",
                  endDate: m.end_date_iso || m.endDate || m.endDateISO,
                  active: true, // Gamma API already filtered for active markets
                  volume: m.volumeUSD || m.volume || "0",
                });
              }
            }
          }
        } catch (clobErr) {
          console.error("Error fetching CLOB markets:", clobErr);
        }
        
        // If CLOB fetch failed, try to use condition IDs directly as token IDs (fallback)
        // This might work for some markets
        if (allValidMarkets.length === 0) {
          for (const m of marketsData) {
            const conditionId = m.condition_id || m.conditionId || "";
            if (conditionId) {
              // Use condition ID as token ID (this is a fallback - may not work for price data)
              allValidMarkets.push({
                id: conditionId,
                tokenId: conditionId, // Fallback: use condition ID
                question: m.question || m.title || "Unknown Market",
                slug: m.slug || m.market_slug || "",
                endDate: m.end_date_iso || m.endDate || m.endDateISO,
                active: true,
                volume: m.volumeUSD || m.volume || "0",
              });
            }
          }
        }
        
        // Take first 5 (they're already ordered by newest first from the API)
        const formattedMarkets = allValidMarkets.slice(0, 5);

        if (formattedMarkets.length === 0) {
          throw new Error(`No markets found with valid token IDs and condition IDs. Total markets: ${marketsData.length}`);
        }

        setMarkets(formattedMarkets);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching markets:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch markets. Please check the console for details.");
        setLoading(false);
      }
    };

    fetchMarkets();
  }, []);

  return { markets, loading, error };
}

