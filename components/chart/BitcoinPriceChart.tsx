"use client";

import { createChart, type ISeriesApi, type Time, type UTCTimestamp, LineSeries, type AutoscaleInfo } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { useChainlinkBTCPrice } from "@/lib/useChainlinkBTCPrice";

interface BitcoinPriceChartProps {
  targetPrice?: number;
  enabled?: boolean;
}

export default function BitcoinPriceChart({ targetPrice, enabled = true }: BitcoinPriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const targetPriceLineRef = useRef<any>(null); // Stores the price line object, not a series
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const priceHistoryRef = useRef<Array<{ time: number; value: number }>>([]);
  const currentPriceRef = useRef<number | null>(null);
  const { currentPrice } = useChainlinkBTCPrice(enabled);

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
        secondsVisible: true,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000); // Convert Unix timestamp to milliseconds
          return date.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
        }
      },
      localization: {
        timeFormatter: (time: number) => {
          const date = new Date(time * 1000); // Convert Unix timestamp to milliseconds
          return date.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
        }
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

    // Add target price line as a horizontal price line with label
    if (targetPrice && seriesRef.current) {
      const targetLine = seriesRef.current.createPriceLine({
        price: targetPrice,
        color: "#9ca3af",
        lineWidth: 1,
        lineStyle: 2, // dotted
        axisLabelVisible: true,
        title: "target",
      });
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

    // Add new price point (store time as number in ref)
    const newPoint = {
      time: now,
      value: currentPrice
    };

    priceHistoryRef.current.push(newPoint);

    // Keep only last minute of data
    priceHistoryRef.current = priceHistoryRef.current.filter(p => p.time >= oneMinuteAgo);

    // Update price series
    try {
      // Convert to chart format (Time type)
      const chartPoint = {
        time: now as UTCTimestamp as Time,
        value: currentPrice
      };
      
      // If this is the first point, set all data, otherwise just update
      if (priceHistoryRef.current.length === 1) {
        seriesRef.current.setData([chartPoint]);
      } else {
        seriesRef.current.update(chartPoint);
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

  // Update target price line when target price changes
  useEffect(() => {
    if (!targetPriceLineRef.current || !targetPrice || !enabled) return;

    try {
      // Update the price line's price value
      targetPriceLineRef.current.applyOptions({
        price: targetPrice,
      });
    } catch (error) {
      console.error("Error updating target price line:", error);
    }
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

