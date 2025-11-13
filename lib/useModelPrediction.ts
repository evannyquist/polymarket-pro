"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Hook that generates a model prediction for chance of up using a random walk
 * The prediction stays within +/-10 points of the actual chance
 * Uses a random walk pattern for gradual changes
 */
export function useModelPrediction(actualChance: number | null) {
  const [predictedChance, setPredictedChance] = useState<number | null>(null);
  const walkRef = useRef(0); // Current position in the random walk
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActualRef = useRef<number | null>(null);

  useEffect(() => {
    if (actualChance === null) {
      setPredictedChance(null);
      walkRef.current = 0;
      lastActualRef.current = null;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initialize or adjust prediction if actual chance changed significantly
    if (lastActualRef.current === null) {
      // First time: start with a random offset within +/-10 points
      walkRef.current = (Math.random() - 0.5) * 20; // Random between -10 and +10
      walkRef.current = Math.max(-10, Math.min(10, walkRef.current));
      const initialPredicted = actualChance + walkRef.current;
      setPredictedChance(Math.max(0, Math.min(100, initialPredicted)));
      lastActualRef.current = actualChance;
    } else if (Math.abs(actualChance - lastActualRef.current) > 5) {
      // Actual changed significantly: adjust walk to stay within bounds
      // Keep the walk offset but ensure it's still valid for new actual
      walkRef.current = Math.max(-10, Math.min(10, walkRef.current));
      const adjustedPredicted = actualChance + walkRef.current;
      setPredictedChance(Math.max(0, Math.min(100, adjustedPredicted)));
      lastActualRef.current = actualChance;
    } else {
      // Small change: just update the reference
      lastActualRef.current = actualChance;
    }

    // Update the random walk gradually every second
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        const currentActual = lastActualRef.current;
        if (currentActual === null) return;

        // Small random step
        const step = (Math.random() - 0.5) * 0.3; // Small steps between -0.15 and +0.15
        walkRef.current += step;
        
        // Clamp the walk to stay within +/-10 points of current actual
        walkRef.current = Math.max(-10, Math.min(10, walkRef.current));
        
        // Calculate predicted chance: current actual + walk offset
        const predicted = currentActual + walkRef.current;
        
        // Ensure it stays within bounds (0-100)
        const clampedPredicted = Math.max(0, Math.min(100, predicted));
        
        setPredictedChance(clampedPredicted);
      }, 1000); // Update every second
    }

    lastActualRef.current = actualChance;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [actualChance]);

  return predictedChance;
}

