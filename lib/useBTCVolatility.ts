"use client";

import { useEffect, useState } from "react";

/**
 * Hook to fetch Bitcoin volatility (DVOL - Deribit 30-day implied volatility)
 * This fetches live DVOL data from Glassnode API via the /api/dvol endpoint
 */
export function useBTCVolatility(enabled: boolean = true) {
  const [volatility, setVolatility] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setVolatility(null);
      setLoading(false);
      return;
    }

    const fetchVolatility = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/dvol');
        
        if (!response.ok) {
          // Don't throw error - handle gracefully
          console.warn('DVOL data not available - using fallback');
          // Use a fallback volatility if fetch fails (1% is reasonable for BTC)
          setVolatility(0.01);
          setError('DVOL data unavailable');
          return;
        }
        
        const data = await response.json();
        
        if (data.success && data.volatility !== undefined) {
          setVolatility(data.volatility);
        } else {
          console.warn('Invalid volatility data format');
          setVolatility(0.01);
          setError('Invalid data format');
        }
      } catch (err) {
        console.warn('Error fetching volatility (using fallback):', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Use a fallback volatility if fetch fails (1% is reasonable for BTC)
        setVolatility(0.01);
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchVolatility();

    // Refresh every 5 minutes
    const interval = setInterval(fetchVolatility, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [enabled]);

  return { volatility, loading, error };
}

