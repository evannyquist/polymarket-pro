"use client";

import { createChart, type ISeriesApi, type LineData, type Time, type UTCTimestamp, LineSeries } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { usePolymarketFeed } from "@/lib/polymarketFeed";
import { useAlerts } from "@/components/alerts/AlertsContext";

export default function MarketChart({ marketId }: { marketId: string | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const { latest, history, loading, error } = usePolymarketFeed(marketId);
  const { evaluateAlerts } = useAlerts();

  // Initialize chart (only once)
  useEffect(() => {
    if (!containerRef.current) return;

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
        secondsVisible: false
      },
      crosshair: {
        mode: 0,
        vertLine: { color: "#3b82f6", width: 1, style: 2 },
        horzLine: { color: "#3b82f6", width: 1, style: 2 }
      }
    });

    chartRef.current = chart;

    // v5 API: use addSeries with { type: 'Line' }
    const line = chart.addSeries(LineSeries, {
      lineWidth: 2,
      color: "#3b82f6",
      lineStyle: 0,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: {
        type: "price",
        precision: 3,
        minMove: 0.001
      }
    });

    seriesRef.current = line;
    console.log("Chart and series initialized");

    const onResize = () => chart.applyOptions({ width: containerRef.current!.clientWidth });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      seriesRef.current = null;
      chartRef.current = null;
    };
  }, []);

  // seed history - load all historical data points
  // This effect runs whenever history changes, but we need to ensure the series is ready
  useEffect(() => {
    console.log("History effect triggered:", {
      hasSeries: !!seriesRef.current,
      historyLength: history.length,
      history: history.slice(0, 3) // First 3 points for debugging
    });
    
    if (!seriesRef.current) {
      console.log("Series not ready yet, will retry when series is available");
      // Don't return - we'll set up a retry mechanism
      // Instead, wait a bit and check again
      const timeout = setTimeout(() => {
        if (seriesRef.current && history.length > 0) {
          // Retry setting data
          const data: LineData[] = history.map((p) => {
            const timestamp = p.t as number;
            if (!timestamp || isNaN(timestamp)) {
              return null;
            }
            return {
              time: timestamp as UTCTimestamp as Time,
              value: p.v
            };
          }).filter((d): d is LineData => d !== null);
          
          if (data.length > 0) {
            // Remove duplicate timestamps and ensure strict ascending order
            const timeMap = new Map<number, LineData>();
            for (const point of data) {
              const timeNum = point.time as number;
              timeMap.set(timeNum, point);
            }
            
            const sortedData = Array.from(timeMap.values()).sort((a, b) => {
              const aTime = a.time as number;
              const bTime = b.time as number;
              return aTime - bTime;
            });
            
            // Ensure strictly ascending
            const deduplicatedData: LineData[] = [];
            let lastTime = 0;
            for (const point of sortedData) {
              const currentTime = point.time as number;
              if (currentTime <= lastTime) {
                const adjustedTime = lastTime + 1;
                deduplicatedData.push({
                  time: adjustedTime as UTCTimestamp as Time,
                  value: point.value
                });
                lastTime = adjustedTime;
              } else {
                deduplicatedData.push(point);
                lastTime = currentTime;
              }
            }
            
            try {
              // Clear any existing data first
              seriesRef.current.setData([]);
              // Then set all the data
              seriesRef.current.setData(deduplicatedData);
              console.log(`Chart data set successfully (retry): ${deduplicatedData.length} points`);
              
              // Force chart to fit content
              if (chartRef.current && deduplicatedData.length > 0) {
                chartRef.current.timeScale().fitContent();
                console.log("Chart time scale fitted to content (retry)");
              }
            } catch (error) {
              console.error("Error setting chart data (retry):", error);
            }
          }
        }
      }, 100);
      
      return () => clearTimeout(timeout);
    }
    
    if (history.length === 0) {
      console.log("No history data yet");
      return;
    }
    
    // Convert history points to LineData format for lightweight-charts
    // Timestamps are Unix timestamps in seconds, which lightweight-charts expects
    // lightweight-charts expects timestamps as numbers (seconds since epoch) for UTCTimestamp
    // IMPORTANT: Data must be strictly ascending by time with no duplicates
    const rawData: LineData[] = history.map((p) => {
      const timestamp = p.t as number;
      // Ensure timestamp is valid
      if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
        console.warn("Invalid timestamp:", p);
        return null;
      }
      return {
        time: timestamp as UTCTimestamp as Time,
        value: p.v
      };
    }).filter((d): d is LineData => d !== null);
    
    // Remove duplicate timestamps (keep the last one for each timestamp)
    // Also ensure strict ascending order
    const timeMap = new Map<number, LineData>();
    for (const point of rawData) {
      const timeNum = point.time as number;
      // Keep the last value for each timestamp
      timeMap.set(timeNum, point);
    }
    
    // Convert back to array and sort by time (should already be sorted, but ensure it)
    const data = Array.from(timeMap.values()).sort((a, b) => {
      const aTime = a.time as number;
      const bTime = b.time as number;
      return aTime - bTime;
    });
    
    // Ensure strictly ascending (increment duplicate timestamps by 1 second)
    const deduplicatedData: LineData[] = [];
    let lastTime = 0;
    for (const point of data) {
      const currentTime = point.time as number;
      if (currentTime <= lastTime) {
        // Duplicate or out of order timestamp - increment it
        const adjustedTime = lastTime + 1;
        deduplicatedData.push({
          time: adjustedTime as UTCTimestamp as Time,
          value: point.value
        });
        lastTime = adjustedTime;
      } else {
        deduplicatedData.push(point);
        lastTime = currentTime;
      }
    }
    
    console.log(`Setting ${deduplicatedData.length} data points on chart (filtered from ${history.length}, removed ${rawData.length - deduplicatedData.length} duplicates)`);
    if (deduplicatedData.length > 0) {
      console.log("First point:", deduplicatedData[0]);
      console.log("Last point:", deduplicatedData[deduplicatedData.length - 1]);
      console.log("Time range:", {
        first: new Date((deduplicatedData[0].time as number) * 1000).toISOString(),
        last: new Date((deduplicatedData[deduplicatedData.length - 1].time as number) * 1000).toISOString(),
        span: `${(((deduplicatedData[deduplicatedData.length - 1].time as number) - (deduplicatedData[0].time as number)) / 86400).toFixed(1)} days`
      });
    }
    
    // Set all historical data at once
    if (deduplicatedData.length > 0) {
      try {
        // Clear any existing data first
        seriesRef.current.setData([]);
        // Then set all the data
        seriesRef.current.setData(deduplicatedData);
        console.log(`Chart data set successfully: ${deduplicatedData.length} points`);
        
        // Force chart to fit content
        if (chartRef.current && deduplicatedData.length > 0) {
          chartRef.current.timeScale().fitContent();
          console.log("Chart time scale fitted to content");
        }
      } catch (error) {
        console.error("Error setting chart data:", error);
      }
    }
  }, [history]);

  // stream tick + evaluate alerts
  // Only update if the latest point is newer than what's already on the chart
  useEffect(() => {
    if (!seriesRef.current || !latest || history.length === 0) return;
    
    // Check if this point is already in the history (to avoid duplicate updates)
    // The latest point should be the last point in history, so we only update if it's actually new
    const lastHistoryPoint = history[history.length - 1];
    if (lastHistoryPoint && lastHistoryPoint.t === latest.t && lastHistoryPoint.v === latest.v) {
      // This point is already in the history, don't update again
      evaluateAlerts(latest.v);
      return;
    }
    
    // Update with the latest point (this will append if it's newer)
    try {
      seriesRef.current.update({
        time: (latest.t as number) as UTCTimestamp as Time,
        value: latest.v
      });
      console.log("Updated chart with latest point:", latest);
    } catch (error) {
      console.error("Error updating chart with latest point:", error);
    }
    
    evaluateAlerts(latest.v);
  }, [latest, evaluateAlerts, history]);

  return (
    <div className="w-full relative" style={{ height: 500 }}>
      {/* Always render the chart container so it can initialize */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{
          background: "transparent",
          borderRadius: 12,
          overflow: "hidden"
        }}
      />
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f1117]/80 backdrop-blur-sm rounded-xl">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
            <p className="text-gray-400 text-sm">Loading market data...</p>
          </div>
        </div>
      )}
      
      {/* Error overlay */}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f1117]/80 backdrop-blur-sm rounded-xl">
          <div className="text-center">
            <p className="text-red-400 text-sm mb-2">Error loading market data</p>
            <p className="text-gray-500 text-xs">{error}</p>
          </div>
        </div>
      )}
      
      {/* No market selected overlay */}
      {!marketId && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f1117]/80 backdrop-blur-sm rounded-xl">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Please select a market to view the chart</p>
          </div>
        </div>
      )}
    </div>
  );
}
