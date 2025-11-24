"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Hook to get real-time BTC/USDT price from Polymarket RTDS (Binance source)
 * Topic: crypto_prices
 * Symbol: btcusdt (lowercase)
 */
export function useBinanceBTCUSDTPrice(enabled: boolean = true) {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let isSubscribed = true;

    const connect = () => {
      if (!isSubscribed) return;

      try {
        const ws = new WebSocket("wss://ws-live-data.polymarket.com");
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("Connected to Polymarket RTDS (Binance BTC/USDT)");
          setError(null);

          // Subscribe to crypto_prices topic for btcusdt
          const subscribeMessage = {
            auth: {},
            type: "subscribe",
            channel: "crypto_prices",
            markets: ["btcusdt"],
          };

          ws.send(JSON.stringify(subscribeMessage));
          console.log("Subscribed to Binance BTC/USDT via RTDS:", subscribeMessage);

          // Set up ping interval to keep connection alive
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 30000); // Ping every 30 seconds
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Handle pong response
            if (data.type === "pong") {
              return;
            }

            // Handle price update
            if (data.type === "update" && data.symbol === "btcusdt") {
              const price = parseFloat(data.price);
              
              if (!isNaN(price) && price > 0) {
                setCurrentPrice(price);
                setLoading(false);
                console.log("Binance BTC/USDT price update:", price);
              }
            }
          } catch (err) {
            console.error("Error parsing RTDS message:", err);
          }
        };

        ws.onerror = (err) => {
          console.error("Polymarket RTDS WebSocket error (BTC/USDT):", err);
          setError("WebSocket connection error");
        };

        ws.onclose = () => {
          console.log("Polymarket RTDS disconnected (BTC/USDT), reconnecting...");
          
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
          }

          // Reconnect after 5 seconds
          if (isSubscribed) {
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, 5000);
          }
        };
      } catch (err) {
        console.error("Failed to connect to Polymarket RTDS (BTC/USDT):", err);
        setError("Failed to establish connection");
        setLoading(false);

        // Retry connection
        if (isSubscribed) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      }
    };

    connect();

    return () => {
      isSubscribed = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled]);

  return { currentPrice, loading, error };
}

