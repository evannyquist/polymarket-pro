"use client";

import { useState } from "react";
import type { Market } from "./markets";

// Polymarket Gamma API endpoint
const POLYMARKET_GAMMA_API = "https://gamma-api.polymarket.com";
const POLYMARKET_CLOB_API = "https://clob.polymarket.com";

export type EventMarket = {
  question: string;
  tokenId: string; // clobTokenIds[0] - YES outcome token ID
  conditionId?: string;
  slug?: string;
  bestBid?: number;
  bestAsk?: number;
  lastTradePrice?: number;
};

export type EventData = {
  title: string;
  slug: string;
  markets: EventMarket[];
};

export function useMarketBySlug() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [market, setMarket] = useState<Market | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);

  const fetchMarket = async (slug: string): Promise<{ market: Market | null; event: EventData | null }> => {
    setLoading(true);
    setError(null);
    setMarket(null);

    try {
      // Step 1: Fetch event/market by slug from Gamma API
      // Try events endpoint first (recommended per docs)
      const eventResponse = await fetch(`/api/market-by-slug?slug=${encodeURIComponent(slug)}`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!eventResponse.ok) {
        const errorData = await eventResponse.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(`Failed to fetch market: ${errorData.error || eventResponse.statusText}`);
      }

      const eventData = await eventResponse.json();
      console.log("Market/Event data from slug:", JSON.stringify(eventData, null, 2));
      console.log("Response type check:", {
        hasMarkets: !!eventData.markets,
        marketsIsArray: Array.isArray(eventData.markets),
        marketsLength: eventData.markets ? (Array.isArray(eventData.markets) ? eventData.markets.length : 'not array') : 0,
        hasClobTokenIds: !!eventData.clobTokenIds,
        hasConditionId: !!(eventData.conditionId || eventData.condition_id)
      });

      // Check if response is an event with markets array
      // Per documentation: https://docs.polymarket.com/api-reference/events/get-event-by-slug
      // Events endpoint returns an object with a markets array
      if (eventData.markets && Array.isArray(eventData.markets) && eventData.markets.length > 0) {
        // This is an EVENT - extract all markets
        console.log("Found event with", eventData.markets.length, "markets");
        
        const eventMarkets: EventMarket[] = [];
        
        for (const marketItem of eventData.markets) {
          // Extract clobTokenIds for this market
          let clobTokenIdsRaw: string | string[] | undefined = marketItem.clobTokenIds;
          let clobTokenIds: string[] = [];
          
          // Normalize clobTokenIds to an array
          if (clobTokenIdsRaw) {
            if (Array.isArray(clobTokenIdsRaw)) {
              clobTokenIds = clobTokenIdsRaw;
            } else if (typeof clobTokenIdsRaw === "string") {
              try {
                const parsed = JSON.parse(clobTokenIdsRaw);
                if (Array.isArray(parsed)) {
                  clobTokenIds = parsed;
                } else {
                  clobTokenIds = clobTokenIdsRaw.split(",").map(id => id.trim()).filter(id => id.length > 0);
                }
              } catch {
                clobTokenIds = clobTokenIdsRaw.split(",").map(id => id.trim()).filter(id => id.length > 0);
              }
            }
          }
          
          // Use clobTokenIds[0] as the YES token ID
          if (clobTokenIds.length > 0) {
            const tokenId = clobTokenIds[0];
            const question = marketItem.question || "Unknown Market";
            
            eventMarkets.push({
              question,
              tokenId,
              conditionId: marketItem.conditionId || marketItem.condition_id,
              slug: marketItem.slug,
              bestBid: marketItem.bestBid !== undefined ? parseFloat(marketItem.bestBid) : undefined,
              bestAsk: marketItem.bestAsk !== undefined ? parseFloat(marketItem.bestAsk) : undefined,
              lastTradePrice: marketItem.lastTradePrice !== undefined ? parseFloat(marketItem.lastTradePrice) : undefined,
            });
          }
        }
        
        if (eventMarkets.length === 0) {
          throw new Error("Event has no valid markets with clobTokenIds");
        }
        
        const event: EventData = {
          title: eventData.title || eventData.question || "Unknown Event",
          slug: eventData.slug || slug,
          markets: eventMarkets,
        };
        
        setEventData(event);
        setMarket(null); // Clear single market
        setLoading(false);
        
        // Return first market for backward compatibility, but also return event
        const firstMarketData: Market = {
          id: eventMarkets[0].conditionId || eventMarkets[0].tokenId,
          tokenId: eventMarkets[0].tokenId,
          question: eventMarkets[0].question,
          slug: eventMarkets[0].slug || slug,
          active: true,
          bestBid: eventMarkets[0].bestBid,
          bestAsk: eventMarkets[0].bestAsk,
          lastTradePrice: eventMarkets[0].lastTradePrice,
        };
        
        return { market: firstMarketData, event };
      }
      
      // Otherwise, treat as a single market
      let clobTokenIdsRaw: string | string[] | undefined;
      let clobTokenIds: string[] = [];
      let conditionId = "";
      let question = "";
      let marketSlug = slug;

      // Check if response is a market directly (from /markets endpoint)
      if (eventData.clobTokenIds || eventData.conditionId || eventData.condition_id) {
        // This is a market object
        clobTokenIdsRaw = eventData.clobTokenIds;
        conditionId = eventData.conditionId || eventData.condition_id || "";
        question = eventData.question || eventData.title || "Unknown Market";
        marketSlug = eventData.slug || slug;
        console.log("Found market directly:", { clobTokenIds: clobTokenIdsRaw, conditionId, question });
      } 
      // Check if response is an array (markets endpoint can return array)
      else if (Array.isArray(eventData) && eventData.length > 0) {
        const firstItem = eventData[0];
        clobTokenIdsRaw = firstItem.clobTokenIds;
        conditionId = firstItem.conditionId || firstItem.condition_id || "";
        question = firstItem.question || firstItem.title || "Unknown Market";
        marketSlug = firstItem.slug || slug;
        console.log("Found market in array:", { clobTokenIds: clobTokenIdsRaw, conditionId, question });
      } 
      else {
        console.error("Unexpected response structure:", eventData);
        throw new Error("Could not find market data in response. Check console for response structure.");
      }

      // Normalize clobTokenIds to an array
      // clobTokenIds can be: an array, a JSON string array, or a comma-separated string
      if (clobTokenIdsRaw) {
        if (Array.isArray(clobTokenIdsRaw)) {
          clobTokenIds = clobTokenIdsRaw;
        } else if (typeof clobTokenIdsRaw === "string") {
          // Try to parse as JSON first (common case - it's a JSON stringified array)
          try {
            const parsed = JSON.parse(clobTokenIdsRaw);
            if (Array.isArray(parsed)) {
              clobTokenIds = parsed;
            } else {
              // Fallback to comma-separated string
              clobTokenIds = clobTokenIdsRaw.split(",").map(id => id.trim()).filter(id => id.length > 0);
            }
          } catch {
            // Not valid JSON, treat as comma-separated string
            clobTokenIds = clobTokenIdsRaw.split(",").map(id => id.trim()).filter(id => id.length > 0);
          }
        }
      }

      // Extract token ID from clobTokenIds (use first one for simplicity)
      if (!clobTokenIds || clobTokenIds.length === 0) {
        throw new Error("No clobTokenIds found in market data. This market may not have CLOB trading enabled.");
      }

      // Use the first token ID (usually YES outcome for binary markets)
      const tokenId = clobTokenIds[0];
      console.log("Extracted token ID from clobTokenIds:", tokenId);
      console.log("Token ID details:", {
        value: tokenId,
        type: typeof tokenId,
        length: tokenId?.length,
        isNumber: !isNaN(Number(tokenId)),
        raw: JSON.stringify(tokenId)
      });
      console.log("Available token IDs:", clobTokenIds);
      
      // Validate token ID format
      if (!tokenId || typeof tokenId !== "string" || tokenId.trim() === "") {
        throw new Error(`Invalid token ID format: ${JSON.stringify(tokenId)}. Expected a non-empty string.`);
      }

      // Extract current market prices from the response
      // The market object has bestBid, bestAsk, lastTradePrice
      let bestBid: number | undefined;
      let bestAsk: number | undefined;
      let lastTradePrice: number | undefined;
      
      // Get prices from the market object
      if (eventData.bestBid !== undefined) {
        bestBid = parseFloat(eventData.bestBid) || undefined;
      }
      if (eventData.bestAsk !== undefined) {
        bestAsk = parseFloat(eventData.bestAsk) || undefined;
      }
      if (eventData.lastTradePrice !== undefined) {
        lastTradePrice = parseFloat(eventData.lastTradePrice) || undefined;
      }
      
      // If we got the market from an event's markets array, check there too
      if (!bestBid && eventData.markets && Array.isArray(eventData.markets) && eventData.markets.length > 0) {
        const firstMarket = eventData.markets[0];
        if (firstMarket.bestBid !== undefined) bestBid = parseFloat(firstMarket.bestBid) || undefined;
        if (firstMarket.bestAsk !== undefined) bestAsk = parseFloat(firstMarket.bestAsk) || undefined;
        if (firstMarket.lastTradePrice !== undefined) lastTradePrice = parseFloat(firstMarket.lastTradePrice) || undefined;
      }
      
      console.log("Current market prices:", { bestBid, bestAsk, lastTradePrice });

      const marketData: Market = {
        id: conditionId || tokenId, // Use conditionId if available, otherwise use tokenId
        tokenId: tokenId,
        question: question,
        slug: marketSlug,
        active: true,
        bestBid,
        bestAsk,
        lastTradePrice,
      };

      setMarket(marketData);
      setEventData(null); // Clear event data
      setLoading(false);
      return { market: marketData, event: null };
    } catch (err) {
      console.error("Error fetching market by slug:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch market";
      setError(errorMessage);
      setLoading(false);
      setMarket(null);
      setEventData(null);
      return { market: null, event: null };
    }
  };

  return { fetchMarket, loading, error, market, eventData };
}

