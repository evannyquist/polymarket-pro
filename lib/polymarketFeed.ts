"use client";

import { useEffect, useRef, useState } from "react";
import type { Market } from "./markets";

type Point = { t: number; v: number };

// Polymarket CLOB API endpoint (public, no auth required)
const POLYMARKET_CLOB_API = "https://clob.polymarket.com";
// Polymarket CLOB WebSocket endpoint for Market Channel
// Reference: https://docs.polymarket.com/developers/CLOB/websocket/market-channel
const POLYMARKET_WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market";

// Calculate current price from market data
// Per Polymarket docs: midpoint of bid-ask if spread <= $0.10, else lastTradePrice
function calculateCurrentPrice(market: Market | null): number {
  if (!market) return 0.5;
  
  const { bestBid, bestAsk, lastTradePrice } = market;
  
  if (bestBid !== undefined && bestAsk !== undefined) {
    const spread = Math.abs(bestAsk - bestBid);
    if (spread <= 0.10) {
      // Use midpoint of bid-ask spread
      return (bestBid + bestAsk) / 2;
    }
  }
  
  // If spread > $0.10 or no bid/ask, use lastTradePrice
  if (lastTradePrice !== undefined) {
    return lastTradePrice;
  }
  
  // Fallback to midpoint if we have bid/ask but no lastTradePrice
  if (bestBid !== undefined && bestAsk !== undefined) {
    return (bestBid + bestAsk) / 2;
  }
  
  return 0.5; // Default
}

export function usePolymarketFeed(
  marketId: string | null,
  marketData?: Market | null,
  extraMarketTokenIds: string[] = [],
) {
  const [history, setHistory] = useState<Point[]>([]);
  const [latest, setLatest] = useState<Point | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resolvedTokenIdRef = useRef<string | null>(null);
  const isIntentionallyClosingRef = useRef(false);
  const subscribedTokenIdsRef = useRef<string[]>([]);
  const latestByTokenRef = useRef<Map<string, Point>>(new Map());

  // Fetch initial market data and history
  useEffect(() => {
    // Reset intentional close flag for new connections
    isIntentionallyClosingRef.current = false;
    
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Resolve token ID consistently: prefer marketData.tokenId (more reliable) over marketId
    // This ensures both price history and WebSocket use the same token ID, preventing
    // race conditions when state updates are out of sync
    const resolvedTokenId = marketData?.tokenId || marketId;
    resolvedTokenIdRef.current = resolvedTokenId;
    
    const uniqueTokenIds = Array.from(
      new Set(
        [
          resolvedTokenId,
          ...extraMarketTokenIds,
        ].filter((tokenId): tokenId is string => !!tokenId && tokenId.trim() !== ""),
      ),
    );
    subscribedTokenIdsRef.current = uniqueTokenIds;
    
    if (!resolvedTokenId) {
      setLoading(false);
      return;
    }

    // Set latest immediately if we already have cached live data for this token
    const cachedLatest = latestByTokenRef.current.get(resolvedTokenId);
    if (cachedLatest) {
      setLatest(cachedLatest);
    }

    setLoading(true);
    setError(null);

    const fetchMarketData = async () => {
      try {
        const tokenId = resolvedTokenId;
        
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
        
        // Set the latest point
        // First, try to use current market prices if available
        let currentPrice = 0.5;
        if (marketData) {
          currentPrice = calculateCurrentPrice(marketData);
          console.log("Using current market price:", currentPrice, "from market data:", {
            bestBid: marketData.bestBid,
            bestAsk: marketData.bestAsk,
            lastTradePrice: marketData.lastTradePrice
          });
        } else if (historyPoints.length > 0) {
          // Fallback to most recent historical point
          const latestPoint = historyPoints[historyPoints.length - 1];
          currentPrice = latestPoint.v;
        }
        
        const now = Math.floor(Date.now() / 1000);
        const currentPoint: Point = {
          t: now,
          v: Math.max(0, Math.min(1, Math.round(currentPrice * 1000) / 1000))
        };
        
        setLatest(currentPoint);
        latestByTokenRef.current.set(resolvedTokenId, currentPoint);
        
        // If we have current market price and no history, add it to history
        if (historyPoints.length === 0 && marketData) {
          setHistory([currentPoint]);
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

    const appendPointToHistory = (point: Point) => {
      setHistory((prev) => {
        if (prev.length > 0 && point.t <= prev[prev.length - 1].t) {
          return prev;
        }
        const newHistory = [...prev, point];
        // Keep last 500 points
        return newHistory.length > 500 ? newHistory.slice(-500) : newHistory;
      });
      setLatest(point);
    };

    const updateLatestForToken = (tokenId: string, point: Point) => {
      latestByTokenRef.current.set(tokenId, point);
      if (tokenId === resolvedTokenIdRef.current) {
        appendPointToHistory(point);
      }
    };

    // Set up WebSocket connection for real-time market updates
    // Reference: https://docs.polymarket.com/developers/CLOB/websocket/market-channel
    // This is a public channel, so authentication may not be required
    // Use the same resolved token ID to ensure consistency with price history fetch
    if (uniqueTokenIds.length > 0) {
      console.log("Setting up WebSocket connection for tokens:", uniqueTokenIds);
      try {
        // Connect to Polymarket CLOB WebSocket Market Channel
        const ws = new WebSocket(`${POLYMARKET_WS_URL}`);
        
        ws.onopen = () => {
          console.log("WebSocket connected to Market Channel");
          // Subscribe to market channel with asset_id (token ID)
          // Format: { type: "market", assets_ids: [tokenId] }
          // Reference: https://docs.polymarket.com/developers/CLOB/websocket/market-channel
          ws.send(JSON.stringify({
            type: "market",
            assets_ids: uniqueTokenIds
          }));
          console.log("Subscribed to market channel for tokens:", uniqueTokenIds);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("WebSocket message:", data);
            
            // Handle different event types per documentation
            // Reference: https://docs.polymarket.com/developers/CLOB/websocket/market-channel
            
            if (data.event_type === "last_trade_price" && data.price !== undefined) {
              // last_trade_price message: emitted when a trade happens
              const tokenId = data.asset_id;
              if (tokenId && subscribedTokenIdsRef.current.includes(tokenId)) {
                const price = parseFloat(data.price);
                const normalizedPrice = Math.max(0, Math.min(1, price));
                // Timestamp is in milliseconds, convert to seconds
                const timestamp = data.timestamp ? Math.floor(parseInt(data.timestamp, 10) / 1000) : Math.floor(Date.now() / 1000);
                
                const point: Point = {
                  t: timestamp,
                  v: Math.round(normalizedPrice * 1000) / 1000
                };
                
                updateLatestForToken(tokenId, point);
                console.log("Updated from last_trade_price:", { tokenId, point });
              }
            } else if (data.event_type === "price_change" && data.price_changes && Array.isArray(data.price_changes)) {
              // price_change message: emitted when orders are placed/cancelled
              // Contains best_bid and best_ask in each PriceChange object
              for (const priceChange of data.price_changes) {
                const tokenId = priceChange.asset_id;
                if (!tokenId || !subscribedTokenIdsRef.current.includes(tokenId)) continue;
                
                if (priceChange.best_bid !== undefined && priceChange.best_ask !== undefined) {
                  const bid = parseFloat(priceChange.best_bid);
                  const ask = parseFloat(priceChange.best_ask);
                  const spread = Math.abs(ask - bid);
                  
                  // Calculate price: midpoint if spread <= 0.10, else use last trade price if available
                  let price: number;
                  if (spread <= 0.10) {
                    price = (bid + ask) / 2;
                  } else if (priceChange.price !== undefined) {
                    const lastTrade = parseFloat(priceChange.price);
                    price = isNaN(lastTrade) ? (bid + ask) / 2 : lastTrade;
                  } else {
                    price = (bid + ask) / 2;
                  }
                  
                  const normalizedPrice = Math.max(0, Math.min(1, price));
                  // Timestamp is in milliseconds, convert to seconds
                  const timestamp = data.timestamp ? Math.floor(parseInt(data.timestamp, 10) / 1000) : Math.floor(Date.now() / 1000);
                  
                  const point: Point = {
                    t: timestamp,
                    v: Math.round(normalizedPrice * 1000) / 1000
                  };
                  
                  updateLatestForToken(tokenId, point);
                  console.log("Updated from price_change:", { tokenId, point, bid, ask, spread });
                }
              }
            } else if (data.event_type === "book" && data.asset_id) {
              // book message: emitted on first subscription and when trades affect the book
              // Extract best bid/ask from the book
              const tokenId = data.asset_id;
              if (tokenId && subscribedTokenIdsRef.current.includes(tokenId) && data.bids && data.bids.length > 0 && data.asks && data.asks.length > 0) {
                // bids are sorted descending (highest first), asks are sorted ascending (lowest first)
                const bestBid = parseFloat(data.bids[0].price);
                const bestAsk = parseFloat(data.asks[0].price);
                const spread = Math.abs(bestAsk - bestBid);
                
                // Calculate price: midpoint if spread <= 0.10
                const price = spread <= 0.10 ? (bestBid + bestAsk) / 2 : (bestBid + bestAsk) / 2;
                const normalizedPrice = Math.max(0, Math.min(1, price));
                // Timestamp is in milliseconds, convert to seconds
                const timestamp = data.timestamp ? Math.floor(parseInt(data.timestamp) / 1000) : Math.floor(Date.now() / 1000);
                
                const point: Point = {
                  t: timestamp,
                  v: Math.round(normalizedPrice * 1000) / 1000
                };
                
                // Only update if this is a new point (not just initial book snapshot)
                // We'll use price_change and last_trade_price for updates
                console.log("Received book snapshot:", { tokenId, bestBid, bestAsk, spread, price: point.v });
              }
            }
          } catch (err) {
            console.error("Error parsing WebSocket message:", err, event.data);
          }
        };
        
        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          console.error("WebSocket readyState:", ws.readyState);
          console.error("WebSocket URL:", POLYMARKET_WS_URL);
        };
        
        ws.onclose = (event) => {
          console.log("WebSocket closed:", event.code, event.reason);
          wsRef.current = null;
          
          // Only reconnect if this wasn't an intentional close and we still have a market selected
          // Use resolvedTokenIdRef to check if we still have a valid token ID
          if (!isIntentionallyClosingRef.current && subscribedTokenIdsRef.current.length > 0) {
            console.log("WebSocket closed unexpectedly, scheduling reconnection...");
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log("Attempting to reconnect WebSocket...");
              // Trigger reconnection by incrementing reconnectTrigger, which will cause the effect to re-run
              setReconnectTrigger((prev) => prev + 1);
            }, 3000);
          }
        };
        
        wsRef.current = ws;
      } catch (err) {
        console.error("Error setting up WebSocket:", err);
      }
    } else {
      // Fallback: Poll for price updates every 10 seconds if WebSocket is not available
      intervalRef.current = setInterval(async () => {
        try {
          const tokenIdToUse = resolvedTokenIdRef.current || marketId;
          if (!tokenIdToUse) return;
          
          // Fetch latest price history
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
            latestByTokenRef.current.set(tokenIdToUse, point);
          }
        } catch (err) {
          console.error("Error polling price history:", err);
        }
      }, 10000); // Poll every 10 seconds as fallback
    }

    // Cleanup function
    return () => {
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Mark as intentional close to prevent reconnection
      isIntentionallyClosingRef.current = true;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // Note: isIntentionallyClosingRef.current is reset to false at the start of the next effect run (line 57)
      // We don't reset it here to avoid race conditions where onclose fires after cleanup
    };
  }, [marketId, marketData?.tokenId, extraMarketTokenIds.join("|"), reconnectTrigger]);

  return { history, latest, loading, error };
}

