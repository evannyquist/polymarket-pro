"use client";

import { createChart, type ISeriesApi, type LineData, type Time, type UTCTimestamp, LineSeries, AreaSeries, type AutoscaleInfo, type AreaData } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { usePolymarketFeed } from "@/lib/polymarketFeed";
import { useAlerts } from "@/components/alerts/AlertsContext";

export default function MarketChart({ 
  marketId, 
  marketData,
  extraMarketTokenIds = [],
  onLatestChange,
  predictedChance,
  signal,
}: { 
  marketId: string | null;
  marketData?: any;
  extraMarketTokenIds?: string[];
  onLatestChange?: (latest: { t: number; v: number } | null) => void;
  predictedChance?: number | null;
  signal?: { type: string; color: string } | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const predictedSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const lastChartTimeRef = useRef<number>(0);
  const predictedDataRef = useRef<Map<number, number>>(new Map()); // Track predicted values by timestamp
  const { latest, history, loading, error } = usePolymarketFeed(marketId, marketData, extraMarketTokenIds);
  const { evaluateAlerts } = useAlerts();

  // Notify parent of latest value changes
  useEffect(() => {
    if (onLatestChange) {
      onLatestChange(latest);
    }
  }, [latest, onLatestChange]);

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

    line.applyOptions({
      autoscaleInfoProvider: (): AutoscaleInfo => ({
        priceRange: {
          minValue: 0,
          maxValue: 1
        }
      })
    });

    seriesRef.current = line;

    // Add predicted chance line series
    const predictedLine = chart.addSeries(LineSeries, {
      lineWidth: 2,
      color: "#60a5fa", // blue-400
      lineStyle: 2, // dashed
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: {
        type: "price",
        precision: 3,
        minMove: 0.001
      }
    });

    predictedLine.applyOptions({
      autoscaleInfoProvider: (): AutoscaleInfo => ({
        priceRange: {
          minValue: 0,
          maxValue: 1
        }
      })
    });

    predictedSeriesRef.current = predictedLine;

    // Add area series for fill between lines
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: "transparent",
      topColor: "rgba(34, 197, 94, 0.2)", // green-500 with opacity
      bottomColor: "rgba(34, 197, 94, 0.05)",
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: {
        type: "price",
        precision: 3,
        minMove: 0.001
      }
    });

    areaSeries.applyOptions({
      autoscaleInfoProvider: (): AutoscaleInfo => ({
        priceRange: {
          minValue: 0,
          maxValue: 1
        }
      })
    });

    areaSeriesRef.current = areaSeries;
    console.log("Chart and series initialized");

    const onResize = () => chart.applyOptions({ width: containerRef.current!.clientWidth });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      seriesRef.current = null;
      predictedSeriesRef.current = null;
      areaSeriesRef.current = null;
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
              lastChartTimeRef.current = deduplicatedData[deduplicatedData.length - 1].time as number;
              console.log(`Chart data set successfully (retry): ${deduplicatedData.length} points`);
              
              if (chartRef.current && deduplicatedData.length > 0) {
                // Set visible range to last 1 hour (3600 seconds)
                const lastTime = deduplicatedData[deduplicatedData.length - 1].time as number;
                const oneHourAgo = lastTime - 3600;
                chartRef.current.timeScale().setVisibleRange({
                  from: oneHourAgo as UTCTimestamp as Time,
                  to: lastTime as UTCTimestamp as Time
                });
                console.log("Chart time scale set to 1 hour (retry)");
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
          lastChartTimeRef.current = deduplicatedData[deduplicatedData.length - 1].time as number;
          console.log(`Chart data set successfully: ${deduplicatedData.length} points`);
          
          if (chartRef.current && deduplicatedData.length > 0) {
            // Set visible range to last 1 hour (3600 seconds)
            const lastTime = deduplicatedData[deduplicatedData.length - 1].time as number;
            const oneHourAgo = lastTime - 3600;
            chartRef.current.timeScale().setVisibleRange({
              from: oneHourAgo as UTCTimestamp as Time,
              to: lastTime as UTCTimestamp as Time
            });
            console.log("Chart time scale set to 1 hour");
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
    
    const newTime = typeof latest.t === "number" ? latest.t : Number(latest.t);
    if (!newTime || isNaN(newTime)) {
      console.warn("Skipping update due to invalid time", latest);
      return;
    }
    
    if (newTime <= lastChartTimeRef.current) {
      evaluateAlerts(latest.v);
      return;
    }
    
    // Update with the latest point (this will append if it's newer)
    try {
      seriesRef.current.update({
        time: newTime as UTCTimestamp as Time,
        value: latest.v
      });
      lastChartTimeRef.current = newTime;
      console.log("Updated chart with latest point:", latest);
      
      // Update time scale to show last 1 hour
      if (chartRef.current) {
        const oneHourAgo = newTime - 3600;
        chartRef.current.timeScale().setVisibleRange({
          from: oneHourAgo as UTCTimestamp as Time,
          to: newTime as UTCTimestamp as Time
        });
      }
    } catch (error) {
      console.error("Error updating chart with latest point:", error);
    }
    
    evaluateAlerts(latest.v);
  }, [latest, evaluateAlerts, history]);

  // Update area series color based on signal
  useEffect(() => {
    if (!areaSeriesRef.current || !signal) return;

    if (signal.type === "BUY") {
      areaSeriesRef.current.applyOptions({
        topColor: "rgba(34, 197, 94, 0.2)", // green-500
        bottomColor: "rgba(34, 197, 94, 0.05)"
      });
    } else if (signal.type === "SELL") {
      areaSeriesRef.current.applyOptions({
        topColor: "rgba(239, 68, 68, 0.2)", // red-500
        bottomColor: "rgba(239, 68, 68, 0.05)"
      });
    } else {
      // NO OPP - grey
      areaSeriesRef.current.applyOptions({
        topColor: "rgba(156, 163, 175, 0.2)", // gray-400
        bottomColor: "rgba(156, 163, 175, 0.05)"
      });
    }
  }, [signal]);

  // Update predicted line and area series when predictedChance or latest changes
  useEffect(() => {
    if (!predictedSeriesRef.current || !areaSeriesRef.current || !latest || predictedChance === null || predictedChance === undefined) {
      return;
    }

    const newTime = typeof latest.t === "number" ? latest.t : Number(latest.t);
    if (!newTime || isNaN(newTime)) return;

    // Convert predicted chance from percentage (0-100) to decimal (0-1)
    const predictedValue = predictedChance / 100;
    const actualValue = latest.v;

    // Store predicted value for this timestamp
    predictedDataRef.current.set(newTime, predictedValue);

    try {
      // Update predicted line
      predictedSeriesRef.current.update({
        time: newTime as UTCTimestamp as Time,
        value: predictedValue
      });

      // Update area series - area fills between actual and predicted
      // For area series, we'll use the higher value and set baseValue to the lower value
      const areaValue = Math.max(actualValue, predictedValue);
      const areaBaseValue = Math.min(actualValue, predictedValue);
      
      areaSeriesRef.current.update({
        time: newTime as UTCTimestamp as Time,
        value: areaValue,
        ...(areaBaseValue !== 0 && { baseValue: areaBaseValue })
      } as any);
    } catch (error) {
      console.error("Error updating predicted series:", error);
    }
  }, [latest, predictedChance]);

  // Initialize predicted and area series with historical data when history is set
  useEffect(() => {
    if (!predictedSeriesRef.current || !areaSeriesRef.current || !seriesRef.current || history.length === 0 || predictedChance === null || predictedChance === undefined) {
      return;
    }

    // Initialize predicted data points for each historical point
    const predictedValue = predictedChance / 100;
    
    // Create predicted data and ensure it's sorted and deduplicated
    const predictedDataRaw: LineData[] = history.map((p) => {
      const timestamp = p.t as number;
      if (!timestamp || isNaN(timestamp)) return null;
      return {
        time: timestamp as UTCTimestamp as Time,
        value: predictedValue
      };
    }).filter((d): d is LineData => d !== null);

    // Deduplicate and sort predicted data
    const timeMap = new Map<number, LineData>();
    for (const point of predictedDataRaw) {
      const timeNum = point.time as number;
      timeMap.set(timeNum, point);
    }
    
    const sortedPredicted = Array.from(timeMap.values()).sort((a, b) => {
      const aTime = a.time as number;
      const bTime = b.time as number;
      return aTime - bTime;
    });

    // Ensure strictly ascending order
    const deduplicatedPredicted: LineData[] = [];
    let lastTime = 0;
    for (const point of sortedPredicted) {
      const currentTime = point.time as number;
      if (currentTime <= lastTime) {
        const adjustedTime = lastTime + 1;
        deduplicatedPredicted.push({
          time: adjustedTime as UTCTimestamp as Time,
          value: point.value
        });
        lastTime = adjustedTime;
      } else {
        deduplicatedPredicted.push(point);
        lastTime = currentTime;
      }
    }

    // Create area data with same deduplication logic
    const areaDataRaw = history.map((p) => {
      const timestamp = p.t as number;
      if (!timestamp || isNaN(timestamp)) return null;
      const actualValue = p.v;
      const areaValue = Math.max(actualValue, predictedValue);
      const areaBaseValue = Math.min(actualValue, predictedValue);
      return {
        time: timestamp as UTCTimestamp as Time,
        value: areaValue,
        baseValue: areaBaseValue
      };
    }).filter((d): d is { time: Time; value: number; baseValue: number } => d !== null);

    // Deduplicate and sort area data
    const areaTimeMap = new Map<number, { time: Time; value: number; baseValue: number }>();
    for (const point of areaDataRaw) {
      const timeNum = point.time as number;
      areaTimeMap.set(timeNum, point);
    }
    
    const sortedAreaData = Array.from(areaTimeMap.values()).sort((a, b) => {
      const aTime = a.time as number;
      const bTime = b.time as number;
      return aTime - bTime;
    });

    // Ensure strictly ascending order for area data
    const deduplicatedArea: Array<{ time: Time; value: number; baseValue: number }> = [];
    lastTime = 0;
    for (const point of sortedAreaData) {
      const currentTime = point.time as number;
      if (currentTime <= lastTime) {
        const adjustedTime = lastTime + 1;
        deduplicatedArea.push({
          time: adjustedTime as UTCTimestamp as Time,
          value: point.value,
          baseValue: point.baseValue
        });
        lastTime = adjustedTime;
      } else {
        deduplicatedArea.push(point);
        lastTime = currentTime;
      }
    }

    try {
      if (deduplicatedPredicted.length > 0) {
        predictedSeriesRef.current.setData(deduplicatedPredicted);
      }
      if (deduplicatedArea.length > 0) {
        areaSeriesRef.current.setData(deduplicatedArea as any);
      }
    } catch (error) {
      console.error("Error setting predicted/area data:", error);
    }
  }, [history, predictedChance]);

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
