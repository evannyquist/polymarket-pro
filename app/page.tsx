"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AlertsProvider } from "@/components/alerts/AlertsContext";
import AlertModal from "@/components/alerts/AlertModal";
import AlertsList from "@/components/alerts/AlertsList";
import MarketSelector from "@/components/market/MarketSelector";
import AppToaster from "@/components/ui/Toaster";

// SSR-safe dynamic import
const MarketChart = dynamic(() => import("@/components/chart/MockChart"), { ssr: false });

export default function Home() {
  const [open, setOpen] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);

  return (
    <AlertsProvider>
      <main className="min-h-screen bg-gradient-to-br from-[#0a0c10] via-[#0d0f14] to-[#0a0c10]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <header className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text text-transparent mb-2">
                  Polymarket Pro
                </h1>
                <p className="text-gray-400 text-sm sm:text-base">
                  Live charts · Alerts · Pro analytics
                  <span className="ml-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs font-medium">
                    Live Data
                  </span>
                </p>
              </div>
              <button
                onClick={() => setOpen(true)}
                className="group relative px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  Set Alert
                </span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-200" />
              </button>
            </div>
          </header>

          {/* Chart Section */}
          <section className="mb-8">
            <div className="bg-[#0f1117] border border-gray-800/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Price Chart</h2>
                  <p className="text-sm text-gray-400">Real-time odds visualization</p>
                </div>
                <div className="flex gap-2">
                  <MarketSelector selectedMarketId={selectedMarketId} onSelect={setSelectedMarketId} />
                </div>
              </div>
              <MarketChart marketId={selectedMarketId} />
            </div>
          </section>

          {/* Alerts Section */}
          <section>
            <AlertsList />
          </section>
        </div>

        <AlertModal open={open} onClose={() => setOpen(false)} />
        <AppToaster />
      </main>
    </AlertsProvider>
  );
}
