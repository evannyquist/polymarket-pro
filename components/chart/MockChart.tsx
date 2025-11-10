"use client";

import { createChart, type ISeriesApi, type LineData, type Time, type UTCTimestamp, LineSeries } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { useMockOddsFeed } from "@/lib/mockFeed";
import { useAlerts } from "@/components/alerts/AlertsContext";

export default function MockChart() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const { latest, history } = useMockOddsFeed();
  const { evaluateAlerts } = useAlerts();

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

    const onResize = () => chart.applyOptions({ width: containerRef.current!.clientWidth });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, []);

  // seed history
  useEffect(() => {
    if (!seriesRef.current || history.length === 0) return;
    const data: LineData[] = history.map((p) => ({
      time: p.t as UTCTimestamp as Time,
      value: p.v
    }));
    seriesRef.current.setData(data);
  }, [history]);

  // stream tick + evaluate alerts
  useEffect(() => {
    if (!seriesRef.current || !latest) return;
    seriesRef.current.update({
      time: latest.t as UTCTimestamp as Time,
      value: latest.v
    });
    evaluateAlerts(latest.v);
  }, [latest, evaluateAlerts]);

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
