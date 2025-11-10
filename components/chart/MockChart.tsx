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
      height: 420,
      layout: { background: { color: "#0b0d12" }, textColor: "#c9d1d9" },
      grid: { vertLines: { color: "#1f232b" }, horzLines: { color: "#1f232b" } },
      rightPriceScale: { borderColor: "#1f232b" },
      timeScale: { borderColor: "#1f232b" }
    });

    // v5 API: use addSeries with { type: 'Line' }
    const line = chart.addSeries(LineSeries, {
      lineWidth: 2
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
      style={{
        width: "100%",
        height: 420,
        background: "#0b0d12",
        border: "1px solid #1f232b",
        borderRadius: 12
      }}
    />
  );
}
