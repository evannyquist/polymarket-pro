"use client";

import { createChart, type ISeriesApi, type LineData, type Time, type UTCTimestamp, LineSeries } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { usePolymarketFeed } from "@/lib/polymarketFeed";
import { useAlerts } from "@/components/alerts/AlertsContext";

export default function MarketChart({ 
  marketId, 
  marketData 
}: { 
  marketId: string | null;
  marketData?: any;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const { latest, history, loading, error } = usePolymarketFeed(marketId, marketData);
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

  // Track if we've initialized the chart with historical data
  const historyInitializedRef = useRef(false);
  const lastHistoryLengthRef = useRef(0);
  const lastMarketIdRef = useRef<string | null>(null);

  // Reset initialization when market changes
  useEffect(() => {
    if (marketId !== lastMarketIdRef.current) {
      historyInitializedRef.current = false;
      lastHistoryLengthRef.current = 0;
      lastMarketIdRef.current = marketId;
    }
  }, [marketId]);

  // seed history - load all historical data points
  // This effect runs whenever history changes, but we only want to reset the chart
  // when history is first loaded or when it changes significantly
  useEffect(() => {
    if (!seriesRef.current) {
      console.log("Series not ready yet, will retry when series is available");
      const timeout = setTimeout(() => {
        if (seriesRef.current && history.length > 0 && !historyInitializedRef.current) {
          // Retry setting initial data
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
              seriesRef.current.setData([]);
              seriesRef.current.setData(deduplicatedData);
              historyInitializedRef.current = true;
              lastHistoryLengthRef.current = history.length;
              console.log(`Chart data set successfully (retry): ${deduplicatedData.length} points`);
              
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
    
    // Only reset the entire chart if:
    // 1. We haven't initialized yet (first load)
    // 2. History length decreased significantly (user switched markets)
    const shouldReset = !historyInitializedRef.current || 
                        (history.length < lastHistoryLengthRef.current * 0.5);
    
    if (shouldReset) {
      // Initial load or significant change - reset entire chart
      const rawData: LineData[] = history.map((p) => {
        const timestamp = p.t as number;
        if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
          return null;
        }
        return {
          time: timestamp as UTCTimestamp as Time,
          value: p.v
        };
      }).filter((d): d is LineData => d !== null);
      
      const timeMap = new Map<number, LineData>();
      for (const point of rawData) {
        const timeNum = point.time as number;
        timeMap.set(timeNum, point);
      }
      
      const data = Array.from(timeMap.values()).sort((a, b) => {
        const aTime = a.time as number;
        const bTime = b.time as number;
        return aTime - bTime;
      });
      
      const deduplicatedData: LineData[] = [];
      let lastTime = 0;
      for (const point of data) {
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
      
      if (deduplicatedData.length > 0) {
        try {
          seriesRef.current.setData([]);
          seriesRef.current.setData(deduplicatedData);
          historyInitializedRef.current = true;
          lastHistoryLengthRef.current = history.length;
          console.log(`Chart data set successfully: ${deduplicatedData.length} points`);
          
          if (chartRef.current && deduplicatedData.length > 0) {
            chartRef.current.timeScale().fitContent();
            console.log("Chart time scale fitted to content");
          }
        } catch (error) {
          console.error("Error setting chart data:", error);
        }
      }
    } else {
      // History is just being appended - don't reset, let the latest effect handle updates
      lastHistoryLengthRef.current = history.length;
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
