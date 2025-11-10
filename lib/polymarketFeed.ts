"use client";

import { useEffect, useRef, useState } from "react";

type Point = { t: number; v: number };

// Polymarket CLOB API endpoint (public, no auth required)
const POLYMARKET_CLOB_API = "https://clob.polymarket.com";

export function usePolymarketFeed(marketId: string | null) {
  const [history, setHistory] = useState<Point[]>([]);
  const [latest, setLatest] = useState<Point | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const resolvedTokenIdRef = useRef<string | null>(null);

  // Fetch initial market data and history
  useEffect(() => {
    if (!marketId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchMarketData = async () => {
      try {
        // marketId should be a token ID (from the slug-based market selector)
        // The market selector now provides token IDs directly after resolving from slug
        resolvedTokenIdRef.current = marketId;
        const tokenId = marketId;
        
        if (!tokenId) {
          throw new Error("No token ID provided");
        }
        
        // Fetch price history from CLOB API
        // Reference: https://docs.polymarket.com/api-reference/pricing/get-price-history-for-a-traded-token
        // Format: GET /prices-history?market=clobtokenid&interval=1d
        console.log("Fetching price history with token ID:", tokenId);
        console.log("Token ID type:", typeof tokenId, "Length:", tokenId?.length);
        
        if (!tokenId || tokenId.trim() === "") {
          throw new Error("Token ID is empty or invalid");
        }
        
        const historyResponse = await fetch(`/api/price-history?market=${encodeURIComponent(tokenId.trim())}&interval=1d`, {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
        });

        console.log("Price history API Response status:", historyResponse.status);
        
        if (!historyResponse.ok) {
          const errorData = await historyResponse.json().catch(() => ({ error: historyResponse.statusText }));
          throw new Error(`Failed to fetch price history: ${errorData.error || historyResponse.statusText}`);
        }
        
        const historyData = await historyResponse.json();
        console.log("Price history data:", historyData);
        
        // Convert price history format from { t: timestamp, p: price } to { t: timestamp, v: value }
        // The API returns prices, but we need to normalize them to 0-1 range for odds
        const historyPoints: Point[] = [];
        if (historyData.history && Array.isArray(historyData.history)) {
          for (const point of historyData.history) {
            // Price is already in 0-1 range for binary markets (odds)
            // If it's not, we might need to convert it
            const price = parseFloat(point.p || point.price || "0.5");
            const normalizedPrice = Math.max(0, Math.min(1, price)); // Clamp to 0-1
            historyPoints.push({
              t: point.t || point.timestamp || 0,
              v: Math.round(normalizedPrice * 1000) / 1000, // Round to 3 decimal places
            });
          }
        }
        
        // Sort by timestamp to ensure chronological order
        historyPoints.sort((a, b) => a.t - b.t);
        
        console.log(`Loaded ${historyPoints.length} historical price points`);
        
        // Set the history
        setHistory(historyPoints);
        
        // Set the latest point (most recent)
        if (historyPoints.length > 0) {
          const latestPoint = historyPoints[historyPoints.length - 1];
          setLatest(latestPoint);
        } else {
          // If no history, use a default point
          const now = Math.floor(Date.now() / 1000);
          const defaultPoint = { t: now, v: 0.5 };
          setLatest(defaultPoint);
          setHistory([defaultPoint]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching market data:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch market data";
        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchMarketData();

    // Poll for price history updates every 30 seconds
    // Using price history endpoint instead of book endpoint for real-time updates
    intervalRef.current = setInterval(async () => {
      try {
        const tokenIdToUse = resolvedTokenIdRef.current || marketId;
        if (!tokenIdToUse) return;
        
        // Fetch latest price history (using a shorter interval like 1h to get recent data)
        const historyResponse = await fetch(`/api/price-history?market=${encodeURIComponent(tokenIdToUse.trim())}&interval=1h`, {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
        });
        
        if (!historyResponse.ok) return;
        
        const historyData = await historyResponse.json();
        
        if (historyData.history && Array.isArray(historyData.history) && historyData.history.length > 0) {
          // Get the most recent point
          const latestPoint = historyData.history[historyData.history.length - 1];
          const price = parseFloat(latestPoint.p || latestPoint.price || "0.5");
          const normalizedPrice = Math.max(0, Math.min(1, price));
          
          const point: Point = {
            t: latestPoint.t || latestPoint.timestamp || Math.floor(Date.now() / 1000),
            v: Math.round(normalizedPrice * 1000) / 1000,
          };
          
          // Update history with new point if it's newer than the last one
          setHistory((prev) => {
            if (prev.length === 0 || point.t > prev[prev.length - 1].t) {
              const newHistory = [...prev, point];
              // Keep last 500 points
              return newHistory.length > 500 ? newHistory.slice(-500) : newHistory;
            }
            return prev;
          });
          setLatest(point);
        }
      } catch (err) {
        console.error("Error polling price history:", err);
      }
    }, 30000); // Poll every 30 seconds instead of 3 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [marketId]);

  return { history, latest, loading, error };
}

