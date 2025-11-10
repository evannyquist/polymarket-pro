"use client";

import { useState } from "react";
import type { Market } from "./markets";

// Polymarket Gamma API endpoint
const POLYMARKET_GAMMA_API = "https://gamma-api.polymarket.com";
const POLYMARKET_CLOB_API = "https://clob.polymarket.com";

export function useMarketBySlug() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [market, setMarket] = useState<Market | null>(null);

  const fetchMarket = async (slug: string): Promise<Market | null> => {
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

      // Extract clobTokenIds and other market info from the response
      // According to API docs: markets have clobTokenIds which contains YES/NO token IDs
      // clobTokenIds can be an array or a comma-separated string
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
      // Check if response is an event with markets array
      else if (eventData.markets && Array.isArray(eventData.markets) && eventData.markets.length > 0) {
        // Event contains markets - use the first one
        const firstMarket = eventData.markets[0];
        clobTokenIdsRaw = firstMarket.clobTokenIds;
        conditionId = firstMarket.conditionId || firstMarket.condition_id || "";
        question = firstMarket.question || firstMarket.title || eventData.title || "Unknown Market";
        marketSlug = firstMarket.slug || eventData.slug || slug;
        console.log("Found market in event:", { clobTokenIds: clobTokenIdsRaw, conditionId, question });
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

      const marketData: Market = {
        id: conditionId || tokenId, // Use conditionId if available, otherwise use tokenId
        tokenId: tokenId,
        question: question,
        slug: marketSlug,
        active: true,
      };

      setMarket(marketData);
      setLoading(false);
      return marketData;
    } catch (err) {
      console.error("Error fetching market by slug:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch market";
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  };

  return { fetchMarket, loading, error, market };
}

