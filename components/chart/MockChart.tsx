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
            try {
              seriesRef.current.setData(data);
              console.log(`Chart data set successfully (retry): ${data.length} points`);
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
    const data: LineData[] = history.map((p) => {
      const timestamp = p.t as number;
      // Ensure timestamp is valid
      if (!timestamp || isNaN(timestamp)) {
        console.warn("Invalid timestamp:", p);
        return null;
      }
      return {
        time: timestamp as UTCTimestamp as Time,
        value: p.v
      };
    }).filter((d): d is LineData => d !== null);
    
    console.log(`Setting ${data.length} data points on chart (filtered from ${history.length})`);
    if (data.length > 0) {
      console.log("First point:", data[0]);
      console.log("Last point:", data[data.length - 1]);
      console.log("Sample timestamps:", data.slice(0, 5).map(d => ({ time: d.time, value: d.value })));
    }
    
    // Set all historical data at once
    if (data.length > 0) {
      try {
        seriesRef.current.setData(data);
        console.log("Chart data set successfully");
      } catch (error) {
        console.error("Error setting chart data:", error);
      }
    }
  }, [history]);

  // stream tick + evaluate alerts
  // Only update if the latest point is newer than what's already on the chart
  useEffect(() => {
    if (!seriesRef.current || !latest) return;
    
    // Update with the latest point (this will append if it's newer)
    seriesRef.current.update({
      time: (latest.t as number) as UTCTimestamp as Time,
      value: latest.v
    });
    
    evaluateAlerts(latest.v);
  }, [latest, evaluateAlerts]);

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height: 500 }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
          <p className="text-gray-400 text-sm">Loading market data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height: 500 }}>
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">Error loading market data</p>
          <p className="text-gray-500 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!marketId) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height: 500 }}>
        <div className="text-center">
          <p className="text-gray-400 text-sm">Please select a market to view the chart</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{
        height: 500,
        background: "transparent",
        borderRadius: 12,
        overflow: "hidden"
      }}
    />
  );
}
