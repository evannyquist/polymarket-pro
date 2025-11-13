"use client";

import { useEffect, useState } from "react";

/**
 * Hook to connect to Polymarket RTDS WebSocket for BTC/USDT price updates
 * Uses Polymarket's crypto_prices stream which pipes BTC prices from Binance and Chainlink
 * 
 * Documentation: https://docs.polymarket.com/rtds
 * WebSocket: wss://ws-live-data.polymarket.com
 * Topic: crypto_prices
 * Symbol: btcusdt
 */
export function usePolymarketBTCPrice(enabled: boolean = true) {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setCurrentPrice(null);
      setIsConnected(false);
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimeoutId: NodeJS.Timeout | null = null;
    let isIntentionallyClosing = false;

    const connect = () => {
      try {
        ws = new WebSocket("wss://ws-live-data.polymarket.com");

        ws.onopen = () => {
          setIsConnected(true);
          
          // Subscribe to all crypto prices (no filters), then filter client-side for btcusdt
          // According to docs: https://docs.polymarket.com/developers/RTDS/RTDS-crypto-prices
          const subscribeMessage = {
            action: "subscribe",
            subscriptions: [
              {
                topic: "crypto_prices",
                type: "update"
              }
            ]
          };
          
          ws?.send(JSON.stringify(subscribeMessage));
        };

        ws.onmessage = (event) => {
          try {
            // Handle empty messages (ping/pong or empty frames)
            if (!event.data || event.data.trim() === "") {
              return;
            }
            
            const data = JSON.parse(event.data);
            
            // Check if this is a crypto_prices update message for BTC/USDT
            // According to docs: https://docs.polymarket.com/developers/RTDS/RTDS-crypto-prices
            if (
              data.topic === "crypto_prices" &&
              data.type === "update" &&
              data.payload &&
              data.payload.symbol === "btcusdt" &&
              typeof data.payload.value === "number"
            ) {
              const price = data.payload.value;
              if (price > 0) {
                setCurrentPrice(price);
              }
            }
          } catch (err) {
            // Silently ignore parse errors (might be ping/pong or other non-JSON messages)
          }
        };

        ws.onerror = () => {
          setIsConnected(false);
        };

        ws.onclose = () => {
          setIsConnected(false);
          
          // Reconnect if not intentionally closed
          if (!isIntentionallyClosing && enabled) {
            reconnectTimeoutId = setTimeout(() => {
              connect();
            }, 3000); // Retry after 3 seconds
          }
        };
      } catch (err) {
        setIsConnected(false);
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
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [enabled]);

  return currentPrice;
}

