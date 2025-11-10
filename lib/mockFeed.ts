"use client";

import { useEffect, useRef, useState } from "react";

type Point = { t: number; v: number };

export function useMockOddsFeed() {
  const [history, setHistory] = useState<Point[]>([]);
  const [latest, setLatest] = useState<Point | null>(null);

  const valRef = useRef(0.62);
  const lastTRef = useRef<number | null>(null); // track last emitted timestamp (seconds)

  // seed 100 pts of history, 60s apart (strictly increasing)
  useEffect(() => {
    const now = Math.floor(Date.now() / 1000);
    const seed: Point[] = [];
    let v = valRef.current;

    for (let i = 100; i > 0; i--) {
      v = clamp01(v + step());
      seed.push({ t: now - i * 60, v: round(v) });
    }

    setHistory(seed);
    const last = seed[seed.length - 1]!;
    setLatest(last);
    valRef.current = last.v;
    lastTRef.current = last.t; // start monotonic counter from seeded tail
  }, []);

  // stream ticks (every 750ms) with strictly increasing seconds
  useEffect(() => {
    const id = setInterval(() => {
      const real = Math.floor(Date.now() / 1000);
      const last = lastTRef.current ?? real - 1;
      const t = real <= last ? last + 1 : real; // ensure strictly increasing seconds

      let v = clamp01(valRef.current + step());
      v = round(v);

      const p = { t, v };
      setHistory((h) => (h.length > 500 ? [...h.slice(1), p] : [...h, p]));
      setLatest(p);

      valRef.current = v;
      lastTRef.current = t;
    }, 750);

    return () => clearInterval(id);
  }, []);

  return { history, latest };
}

function step() {
  // small drift + noise
  return (Math.random() - 0.5) * 0.01;
}
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function round(x: number) {
  return Math.round(x * 1000) / 1000;
}
