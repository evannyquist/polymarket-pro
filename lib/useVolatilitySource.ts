"use client";

import { useEffect, useState } from 'react';

export type VolatilitySource = 'manual' | 'dvol' | 'binance-atm-iv';

interface UseVolatilitySourceParams {
  source: VolatilitySource;
  manualValue: number | null;
}

interface VolatilityResponse {
  success: boolean;
  volatility?: number;
  source?: string;
  error?: string;
}

/**
 * Unified hook for fetching volatility from different sources
 * 
 * @param source - The volatility source to use ('manual', 'dvol', or 'binance-atm-iv')
 * @param manualValue - The manual volatility value (used when source is 'manual')
 * @returns Volatility data, loading state, and error message
 */
export function useVolatilitySource({ source, manualValue }: UseVolatilitySourceParams) {
  const [volatility, setVolatility] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If manual source, use the provided manual value
    if (source === 'manual') {
      setVolatility(manualValue);
      setLoading(false);
      setError(null);
      return;
    }

    // Otherwise, fetch from the selected API source
    const fetchVolatility = async () => {
      setLoading(true);
      setError(null);

      try {
        // Determine the API endpoint based on source
        const endpoint = source === 'dvol' 
          ? '/api/volatility/dvol'
          : '/api/volatility/binance-atm-iv';

        const response = await fetch(endpoint);

        if (!response.ok) {
          // Gracefully handle API errors
          const errorMessage = source === 'dvol'
            ? 'DVOL data unavailable'
            : 'Binance ATM IV data unavailable';
          
          console.warn(`${errorMessage} - using fallback`);
          setError(errorMessage);
          setVolatility(manualValue || 0.60); // Fallback to manual or 60%
          return;
        }

        const data: VolatilityResponse = await response.json();

        if (data.success && data.volatility !== undefined) {
          setVolatility(data.volatility);
          setError(null);
        } else {
          console.warn('Invalid volatility data format');
          setError('Invalid data format');
          setVolatility(manualValue || 0.60);
        }
      } catch (err) {
        console.warn(`Error fetching ${source} (using fallback):`, err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setVolatility(manualValue || 0.60);
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchVolatility();

    // Refresh every 5 minutes for API sources
    const interval = setInterval(fetchVolatility, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [source, manualValue]);

  return { volatility, loading, error };
}


