"use client";

import { useEffect, useState } from "react";

/**
 * Hook to poll Binance.com REST API for BTC/USDT price via Next.js API route
 * Polls every second for real-time price updates
 * Returns the latest Bitcoin price
 */
export function useBinancePrice(enabled: boolean = true) {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCurrentPrice(null);
      return;
    }

    const fetchPrice = async () => {
      try {
        const res = await fetch("/api/binance-price");
        const data = await res.json();
        if (data.price) {
          const price = parseFloat(data.price);
          if (!isNaN(price) && price > 0) {
            setCurrentPrice(price);
          }
        }
      } catch (err) {
        // Silently handle errors - don't spam console
      }
    };

    fetchPrice(); // Get it immediately
    const id = setInterval(fetchPrice, 1000); // Then poll every second

    return () => clearInterval(id);
  }, [enabled]);

  return currentPrice;
}

