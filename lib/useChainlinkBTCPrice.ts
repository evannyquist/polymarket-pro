"use client";

import { useEffect, useState } from "react";

/**
 * Hook to connect to Polymarket RTDS WebSocket for Chainlink BTC/USD price updates
 * Uses Polymarket's crypto_prices_chainlink stream for Chainlink Data Streams
 * 
 * Documentation: https://docs.polymarket.com/developers/RTDS/RTDS-overview
 * WebSocket: wss://ws-live-data.polymarket.com
 * Topic: crypto_prices_chainlink
 * Symbol: btc/usd (Chainlink Data Streams)
 * No auth needed for crypto prices
 */
export function useChainlinkBTCPrice(enabled: boolean = true) {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCurrentPrice(null);
      setIsConnected(false);
      setError(null);
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimeoutId: NodeJS.Timeout | null = null;
    let pingIntervalId: NodeJS.Timeout | null = null;
    let isIntentionallyClosing = false;

    const connect = () => {
      try {
        ws = new WebSocket("wss://ws-live-data.polymarket.com");

        ws.onopen = () => {
          setIsConnected(true);
          setError(null);
          
          // Subscribe to Chainlink crypto prices stream
          // Topic: crypto_prices_chainlink
          // Symbol: btc/usd
          // According to docs: https://docs.polymarket.com/developers/RTDS/RTDS-overview
          const subscribeMessage = {
            action: "subscribe",
            subscriptions: [
              {
                topic: "crypto_prices_chainlink",
                type: "*",
                // NOTE: filters must be a JSON-encoded string
                filters: JSON.stringify({ symbol: "btc/usd" })
              }
            ]
          };
          
          ws?.send(JSON.stringify(subscribeMessage));
          console.log("Subscribed to Chainlink BTC/USD via RTDS");
          
          // Start ping interval (every 5 seconds as recommended)
          pingIntervalId = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ action: "ping" }));
            }
          }, 5000);
        };

        ws.onmessage = (event) => {
          try {
            // Handle empty messages (ping/pong or empty frames)
            if (!event.data || event.data.trim() === "") {
              return;
            }
            
            const data = JSON.parse(event.data);
            
            // Handle pong responses
            if (data.action === "pong") {
              return;
            }
            
            // Check if this is a crypto_prices_chainlink update message for BTC/USD
            // According to Polymarket RTDS docs
            if (
              data.topic === "crypto_prices_chainlink" &&
              data.type === "update" &&
              data.payload &&
              data.payload.symbol === "btc/usd" &&
              typeof data.payload.value === "number"
            ) {
              const price = data.payload.value;
              
              if (price > 0) {
                setCurrentPrice(price);
                setError(null);
              }
            }
          } catch (err) {
            // Silently ignore parse errors (might be ping/pong or other non-JSON messages)
          }
        };

        ws.onerror = () => {
          setIsConnected(false);
          setError("WebSocket connection error");
        };

        ws.onclose = () => {
          setIsConnected(false);
          
          if (pingIntervalId) {
            clearInterval(pingIntervalId);
            pingIntervalId = null;
          }
          
          // Reconnect if not intentionally closed
          if (!isIntentionallyClosing && enabled) {
            reconnectTimeoutId = setTimeout(() => {
              connect();
            }, 3000); // Retry after 3 seconds
          }
        };
      } catch (err) {
        setIsConnected(false);
        setError(err instanceof Error ? err.message : "Connection error");
        // Retry connection on error
        if (enabled) {
          reconnectTimeoutId = setTimeout(() => {
            connect();
          }, 3000);
        }
      }
    };

    connect();

    return () => {
      isIntentionallyClosing = true;
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
      }
      if (pingIntervalId) {
        clearInterval(pingIntervalId);
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [enabled]);

  return { currentPrice, loading: !isConnected && currentPrice === null, error };
}

