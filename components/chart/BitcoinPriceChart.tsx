"use client";

import { createChart, type ISeriesApi, type LineData, type Time, type UTCTimestamp, LineSeries, type AutoscaleInfo } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { usePolymarketBTCPrice } from "@/lib/usePolymarketBTCPrice";

interface BitcoinPriceChartProps {
  targetPrice?: number;
  enabled?: boolean;
}

export default function BitcoinPriceChart({ targetPrice, enabled = true }: BitcoinPriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const targetPriceLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const priceHistoryRef = useRef<Array<{ time: number; value: number }>>([]);
  const currentPriceRef = useRef<number | null>(null);
  const currentPrice = usePolymarketBTCPrice(enabled);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current || !enabled) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: "transparent" },
        textColor: "#9ca3af",
        fontSize: 12
      },
      grid: {
        vertLines: { color: "#1f2937", style: 0 },
        horzLines: { color: "#1f2937", style: 0 }
      },
      rightPriceScale: {
        borderColor: "#374151",
        scaleMargins: { top: 0.1, bottom: 0.1 }
      },
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: true
      },
      crosshair: {
        mode: 0,
        vertLine: { color: "#3b82f6", width: 1, style: 2 },
        horzLine: { color: "#3b82f6", width: 1, style: 2 }
      }
    });

    chartRef.current = chart;

    // Add price line series
    const priceLine = chart.addSeries(LineSeries, {
      lineWidth: 2,
      color: "#f7931a", // Bitcoin orange
      lineStyle: 0, // solid
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01
      }
    });

    priceLine.applyOptions({
      autoscaleInfoProvider: (): AutoscaleInfo => {
        // If we have both current price and target price, use the difference-based range
        if (currentPriceRef.current !== null && targetPrice) {
          const currentPriceValue = currentPriceRef.current;
          const difference = Math.abs(currentPriceValue - targetPrice);
          const range = difference * 1.5; // difference + 50% padding
          const halfRange = range / 2;
          
          // Center around the midpoint between current price and target price
          const midpoint = (currentPriceValue + targetPrice) / 2;
          
          return {
            priceRange: {
              minValue: Math.max(0, midpoint - halfRange),
              maxValue: midpoint + halfRange
            }
          };
        }
        
        // Fallback: use price history if available
        const prices = priceHistoryRef.current.map(p => p.value);
        const allPrices = targetPrice ? [...prices, targetPrice] : prices;
        
        if (allPrices.length === 0) {
          return {
            priceRange: {
              minValue: 0,
              maxValue: 100000
            }
          };
        }
        
        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);
        const range = maxPrice - minPrice;
        const padding = Math.max(range * 0.1, 100); // 10% padding or $100
        
        return {
          priceRange: {
            minValue: Math.max(0, minPrice - padding),
            maxValue: maxPrice + padding
          }
        };
      }
    });

    seriesRef.current = priceLine;

    // Add target price line (dotted horizontal line)
    if (targetPrice) {
      const targetLine = chart.addSeries(LineSeries, {
        lineWidth: 1,
        color: "#9ca3af", // Grey
        lineStyle: 2, // dotted
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: {
          type: "price",
          precision: 2,
          minMove: 0.01
        }
      });

      // Target line doesn't need autoscale - it will use the same scale as price line

      targetPriceLineRef.current = targetLine;
    }

    const onResize = () => chart.applyOptions({ width: containerRef.current!.clientWidth });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      seriesRef.current = null;
      targetPriceLineRef.current = null;
      chartRef.current = null;
    };
  }, [enabled, targetPrice]);

  // Update chart with new price data
  useEffect(() => {
    if (!seriesRef.current || !currentPrice || !enabled) return;

    // Update current price ref for autoscale calculation
    currentPriceRef.current = currentPrice;

    const now = Math.floor(Date.now() / 1000);
    const oneMinuteAgo = now - 60;

    // Add new price point
    const newPoint = {
      time: now as UTCTimestamp as Time,
      value: currentPrice
    };

    priceHistoryRef.current.push(newPoint);

    // Keep only last minute of data
    priceHistoryRef.current = priceHistoryRef.current.filter(p => p.time >= oneMinuteAgo);

    // Update price series
    try {
      // If this is the first point, set all data, otherwise just update
      if (priceHistoryRef.current.length === 1) {
        seriesRef.current.setData([newPoint]);
      } else {
        seriesRef.current.update(newPoint);
      }
      
      // Force autoscale recalculation by reapplying options
      // This ensures the y-axis range updates dynamically based on current price vs target price
      if (seriesRef.current) {
        seriesRef.current.applyOptions({
          autoscaleInfoProvider: (): AutoscaleInfo => {
            // If we have both current price and target price, use the difference-based range
            if (currentPriceRef.current !== null && targetPrice) {
              const currentPriceValue = currentPriceRef.current;
              const difference = Math.abs(currentPriceValue - targetPrice);
              const range = difference * 1.5; // difference + 50% padding
              const halfRange = range / 2;
              
              // Center around the midpoint between current price and target price
              const midpoint = (currentPriceValue + targetPrice) / 2;
              
              return {
                priceRange: {
                  minValue: Math.max(0, midpoint - halfRange),
                  maxValue: midpoint + halfRange
                }
              };
            }
            
            // Fallback: use price history if available
            const prices = priceHistoryRef.current.map(p => p.value);
            const allPrices = targetPrice ? [...prices, targetPrice] : prices;
            
            if (allPrices.length === 0) {
              return {
                priceRange: {
                  minValue: 0,
                  maxValue: 100000
                }
              };
            }
            
            const minPrice = Math.min(...allPrices);
            const maxPrice = Math.max(...allPrices);
            const range = maxPrice - minPrice;
            const padding = Math.max(range * 0.1, 100); // 10% padding or $100
            
            return {
              priceRange: {
                minValue: Math.max(0, minPrice - padding),
                maxValue: maxPrice + padding
              }
            };
          }
        });
      }
    } catch (error) {
      console.error("Error updating Bitcoin price chart:", error);
    }

    // Update visible time range to show last minute
    if (chartRef.current) {
      chartRef.current.timeScale().setVisibleRange({
        from: oneMinuteAgo as UTCTimestamp as Time,
        to: now as UTCTimestamp as Time
      });
    }
  }, [currentPrice, enabled, targetPrice]);

  // Update target price line when target price changes or time progresses
  useEffect(() => {
    if (!targetPriceLineRef.current || !targetPrice || !enabled || !chartRef.current) return;

    const now = Math.floor(Date.now() / 1000);
    const oneMinuteAgo = now - 60;

    try {
      // Update target price line to span the visible time range
      const dataPoints: LineData[] = [
        { time: oneMinuteAgo as UTCTimestamp as Time, value: targetPrice },
        { time: now as UTCTimestamp as Time, value: targetPrice }
      ];
      
      targetPriceLineRef.current.setData(dataPoints);
    } catch (error) {
      console.error("Error updating target price line:", error);
    }

    // Update every second to keep the line extending
    const interval = setInterval(() => {
      if (!targetPriceLineRef.current || !targetPrice) return;
      const currentTime = Math.floor(Date.now() / 1000);
      const currentOneMinuteAgo = currentTime - 60;
      
      try {
        const dataPoints: LineData[] = [
          { time: currentOneMinuteAgo as UTCTimestamp as Time, value: targetPrice },
          { time: currentTime as UTCTimestamp as Time, value: targetPrice }
        ];
        targetPriceLineRef.current.setData(dataPoints);
      } catch (error) {
        // Ignore errors
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetPrice, enabled]);

  if (!enabled) {
    return (
      <div className="w-full relative" style={{ height: 500 }}>
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f1117]/80 backdrop-blur-sm rounded-xl">
          <p className="text-gray-400 text-sm">Bitcoin price chart not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative" style={{ height: 500 }}>
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{
          background: "transparent",
          borderRadius: 12,
          overflow: "hidden"
        }}
      />
    </div>
  );
}

