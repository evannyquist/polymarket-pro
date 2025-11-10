"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AlertsProvider } from "@/components/alerts/AlertsContext";
import AlertModal from "@/components/alerts/AlertModal";

// SSR-safe dynamic import
const MockChart = dynamic(() => import("@/components/chart/MockChart"), { ssr: false });

export default function Home() {
  const [open, setOpen] = useState(false);

  return (
    <AlertsProvider>
      <main style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>Polymarket Pro</h1>
            <p style={{ opacity: 0.7 }}>Live charts · Alerts · Pro analytics (demo feed)</p>
          </div>
          <button
            onClick={() => setOpen(true)}
            style={{
              background: "#3b82f6",
              border: "none",
              padding: "10px 14px",
              borderRadius: 8,
              color: "white",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Set Alert
          </button>
        </header>

        <section>
          <MockChart />
        </section>

        <AlertModal open={open} onClose={() => setOpen(false)} />
      </main>
    </AlertsProvider>
  );
}
