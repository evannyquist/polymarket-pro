"use client";

import { useEffect, useState } from "react";

/**
 * Cumulative Distribution Function (CDF) for standard normal distribution
 * Uses the approximation method for better performance
 */
function normalCDF(x: number): number {
  // Constants for the approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  // Save the sign of x
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  // A&S formula 7.1.26
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1 + sign * y);
}

/**
 * Calculate the probability that BTC price will be above target price
 * Using lognormal process model (Black-Scholes approach)
 * 
 * Formula:
 * - σ_T = σ * sqrt(T)  (scale volatility to time window)
 * - d2 = [ln(S0/K) - 0.5 * σ² * T] / σ_T
 * - P(S_T >= K) = 1 - Φ(d2)
 * 
 * @param currentPrice - Current Bitcoin price (S0)
 * @param targetPrice - Target price to beat (K)
 * @param timeRemainingMinutes - Time remaining until market resolution (in minutes)
 * @param volatility - Annualized volatility as decimal (e.g., 0.60 for 60%)
 * @returns Probability (0-1) that price will be above target
 */
function calculateProbability(
  currentPrice: number,
  targetPrice: number,
  timeRemainingMinutes: number,
  volatility: number
): number {
  // Convert time to years (for annualized volatility calculations)
  const timeInYears = timeRemainingMinutes / (365.25 * 24 * 60);
  
  // If no time remaining, use current price comparison
  if (timeRemainingMinutes <= 0 || timeInYears <= 0) {
    return currentPrice > targetPrice ? 1 : 0;
  }
  
  // Scale volatility to the time window: σ_T = σ * sqrt(T)
  const volatilityTerm = volatility * Math.sqrt(timeInYears);
  
  // Avoid division by zero
  if (volatilityTerm === 0) {
    return currentPrice > targetPrice ? 1 : 0;
  }
  
  // Calculate log price ratio: ln(S0/K)
  const logPriceRatio = Math.log(currentPrice / targetPrice);
  
  // Calculate drift adjustment: -0.5 * σ² * T
  const driftAdjustment = -0.5 * volatility * volatility * timeInYears;
  
  // Calculate d2 = [ln(S0/K) - 0.5 * σ² * T] / (σ * sqrt(T))
  const d2 = (logPriceRatio + driftAdjustment) / volatilityTerm;
  
  // Probability that BTC finishes above barrier: P(S_T > K) = Φ(d2)
  const probability = normalCDF(d2);
  
  // Clamp to [0, 1] range
  return Math.max(0, Math.min(1, probability));
}

interface ProbabilityModelParams {
  currentPrice: number | null;
  targetPrice: number | null;
  periodEndTime: Date | null;
  volatility: number | null;
}

/**
 * Hook that calculates the real probability using Bitcoin price and volatility
 */
export function useProbabilityModel({
  currentPrice,
  targetPrice,
  periodEndTime,
  volatility
}: ProbabilityModelParams) {
  const [probability, setProbability] = useState<number | null>(null);

  useEffect(() => {
    // Update probability every second
    const updateProbability = () => {
      if (
        currentPrice === null ||
        targetPrice === null ||
        periodEndTime === null ||
        volatility === null
      ) {
        setProbability(null);
        return;
      }

      // Calculate time remaining in minutes
      const now = new Date();
      const timeRemainingMs = periodEndTime.getTime() - now.getTime();
      const timeRemainingMinutes = Math.max(0, timeRemainingMs / (60 * 1000));

      // Calculate probability
      const prob = calculateProbability(
        currentPrice,
        targetPrice,
        timeRemainingMinutes,
        volatility
      );

      // Convert to percentage (0-100)
      setProbability(prob * 100);
    };

    // Calculate immediately
    updateProbability();

    // Update every second
    const interval = setInterval(updateProbability, 1000);

    return () => clearInterval(interval);
  }, [currentPrice, targetPrice, periodEndTime, volatility]);

  return probability;
}

